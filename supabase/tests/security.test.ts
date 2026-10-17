import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const db = new PGlite();
const a = "10000000-0000-4000-8000-000000000001",
  b = "10000000-0000-4000-8000-000000000002",
  c = "10000000-0000-4000-8000-000000000003";
const g = "20000000-0000-4000-8000-000000000001",
  g2 = "20000000-0000-4000-8000-000000000002",
  r = "30000000-0000-4000-8000-000000000001",
  past = "30000000-0000-4000-8000-000000000002",
  product = "40000000-0000-4000-8000-000000000001";
async function as(role: string, user: string, sql: string) {
  await db.exec(
    `set role ${role}; select set_config('request.jwt.claim.sub','${user}',false);`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,storage to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 alter table storage.objects enable row level security; grant select,insert,delete on storage.objects to anon,authenticated;`);
  for (const migration of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${migration}`, "utf8"));
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${a}','{"name":"Alex"}'),('${b}','{"name":"Ana"}'),('${c}','{"name":"Leo"}');
 insert into public.groups(id,owner_id,name,city) values('${g}','${a}','Orla','POA'),('${g2}','${b}','Outro','POA');
 insert into public.memberships values('${g}','${a}'),('${g}','${b}');
 insert into public.runs(id,group_id,creator_id,title,starts_at,start_point,end_point,distance,pace) values('${r}','${g}','${a}','Futuro',now()+interval '1 day','A','B',5,'6:00'),('${past}','${g}','${a}','Passado',now()-interval '1 day','A','B',5,'6:00');
 insert into public.participants values('${past}','${a}');
 insert into public.products(id,group_id,name,price_cents,category) values('${product}','${g}','Camiseta',8900,'Camiseta');`);
}, 30000);
afterAll(async () => {
  await db.close();
});
describe("Migração e políticas CORRE (Postgres em memória)", () => {
  test("RLS em todas as onze tabelas", async () => {
    const result = await db.query<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`,
    );
    expect(result.rows).toHaveLength(11);
    expect(result.rows.every((r) => r.relrowsecurity)).toBe(true);
  });
  test("visitante explora perfis sem e-mails", async () => {
    const result = await as("anon", "", `select * from public.profiles`);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).not.toHaveProperty("email");
  });
  test("visitante não publica nem lê pedidos", async () => {
    await expect(
      as(
        "anon",
        "",
        `insert into public.posts(user_id,group_id,body) values('${a}','${g}','fake')`,
      ),
    ).rejects.toThrow();
    await expect(
      as("anon", "", `select * from public.orders`),
    ).rejects.toThrow();
  });
  test("perfil automático e edição só pelo próprio corredor", async () => {
    await as(
      "authenticated",
      b,
      `update public.profiles set name='invasor' where id='${a}'`,
    );
    const result = await db.query<{ name: string }>(
      `select name from public.profiles where id='${a}'`,
    );
    expect(result.rows[0].name).toBe("Alex");
    await as(
      "authenticated",
      a,
      `update public.profiles set bio='Corro junto' where id='${a}'`,
    );
  });
  test("não permite assumir identidade de outro dono", async () => {
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.groups(owner_id,name,city) values('${a}','Fake','POA')`,
      ),
    ).rejects.toThrow();
  });
  test("não permite participação sem grupo ou inscrição de outra pessoa", async () => {
    await expect(
      as(
        "authenticated",
        c,
        `insert into public.participants values('${r}','${c}')`,
      ),
    ).rejects.toThrow();
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.participants values('${r}','${a}')`,
      ),
    ).rejects.toThrow();
  });
  test("membro participa e cancela somente a própria inscrição", async () => {
    await as(
      "authenticated",
      b,
      `insert into public.participants values('${r}','${b}')`,
    );
    await as(
      "authenticated",
      c,
      `delete from public.participants where run_id='${r}' and user_id='${b}'`,
    );
    expect(
      (await db.query(`select * from public.participants where run_id='${r}'`))
        .rows,
    ).toHaveLength(1);
    await as(
      "authenticated",
      b,
      `delete from public.participants where run_id='${r}' and user_id='${b}'`,
    );
  });
  test("não permite entrar em corrida passada ou publicar fora do grupo", async () => {
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.participants values('${past}','${b}')`,
      ),
    ).rejects.toThrow();
    await expect(
      as(
        "authenticated",
        c,
        `insert into public.posts(user_id,group_id,body) values('${c}','${g}','Olá')`,
      ),
    ).rejects.toThrow();
  });
  test("registro exige participação e grupo correspondente", async () => {
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.posts(user_id,group_id,run_id,body) values('${b}','${g}','${past}','Fake')`,
      ),
    ).rejects.toThrow();
    await expect(
      as(
        "authenticated",
        a,
        `insert into public.posts(user_id,group_id,run_id,body) values('${a}','${g2}','${past}','Grupo errado')`,
      ),
    ).rejects.toThrow();
    await as(
      "authenticated",
      a,
      `insert into public.posts(user_id,group_id,run_id,body) values('${a}','${g}','${past}','Registro válido')`,
    );
  });
  test("somente dono adiciona produtos", async () => {
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.products(group_id,name,price_cents,category) values('${g}','Fake',1,'Boné')`,
      ),
    ).rejects.toThrow();
  });
  test("ignora preço forjado e restringe pedidos ao comprador e dono", async () => {
    await as(
      "authenticated",
      b,
      `insert into public.orders(user_id,product_id,quantity,size,total_cents) values('${b}','${product}',2,'M',1)`,
    );
    expect(
      (await as("authenticated", b, `select total_cents from public.orders`))
        .rows[0],
    ).toEqual({ total_cents: 17800 });
    expect(
      (await as("authenticated", a, `select * from public.orders`)).rows,
    ).toHaveLength(1);
    expect(
      (await as("authenticated", c, `select * from public.orders`)).rows,
    ).toHaveLength(0);
  });
  test("impede tamanho inválido e alteração de pedido", async () => {
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.orders(user_id,product_id,quantity,size) values('${b}','${product}',1,'Único')`,
      ),
    ).rejects.toThrow();
    await expect(
      as("authenticated", b, `update public.orders set total_cents=1`),
    ).rejects.toThrow();
  });
  test("Storage restringe pastas e publicação de fotos alheias", async () => {
    await expect(
      as(
        "authenticated",
        b,
        `insert into storage.objects(bucket_id,name) values('run-photos','${a}/fake.jpg')`,
      ),
    ).rejects.toThrow();
    await as(
      "authenticated",
      a,
      `insert into storage.objects(bucket_id,name) values('run-photos','${a}/ok.jpg')`,
    );
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.posts(user_id,group_id,body,photo_path) values('${b}','${g}','Fake','${a}/ok.jpg')`,
      ),
    ).rejects.toThrow();
    await as(
      "authenticated",
      a,
      `insert into public.posts(user_id,group_id,body,photo_path) values('${a}','${g}','Foto válida','${a}/ok.jpg')`,
    );
    expect(
      (await as("anon", "", `select * from storage.objects`)).rows,
    ).toHaveLength(1);
  });
});

describe("Organização, privacidade e comunidade", () => {
  test("somente organizadores editam; identidade de dono e criador é imutável", async () => {
    expect(
      (
        await as(
          "authenticated",
          c,
          `update public.runs set title='Invadido' where id='${r}' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      as(
        "authenticated",
        a,
        `update public.runs set creator_id='${b}' where id='${r}'`,
      ),
    ).rejects.toThrow();
    await expect(
      as(
        "authenticated",
        a,
        `update public.runs set starts_at=now()-interval '1 hour' where id='${r}'`,
      ),
    ).rejects.toThrow();
    await as(
      "authenticated",
      a,
      `update public.groups set rules='Leve água',contact='Encontro no portão' where id='${g}'`,
    );
    await expect(
      as(
        "authenticated",
        a,
        `update public.groups set owner_id='${b}' where id='${g}'`,
      ),
    ).rejects.toThrow();
  });
  test("mudanças geram avisos privados sem permitir falsificação", async () => {
    await as(
      "authenticated",
      b,
      `insert into public.participants values('${r}','${b}')`,
    );
    await as(
      "authenticated",
      a,
      `update public.runs set title='Novo horário da turma' where id='${r}'`,
    );
    expect(
      (await as("authenticated", b, `select * from public.notifications`)).rows,
    ).toHaveLength(1);
    expect(
      (await as("authenticated", c, `select * from public.notifications`)).rows,
    ).toHaveLength(0);
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.notifications(user_id,run_id,title,body) values('${c}','${r}','Fake','Fake')`,
      ),
    ).rejects.toThrow();
    await expect(
      as("authenticated", b, `update public.notifications set body='Fake'`),
    ).rejects.toThrow();
    await as(
      "authenticated",
      b,
      `update public.notifications set read_at=now()`,
    );
  });
  test("cancelamento avisa a turma e impede novas inscrições", async () => {
    await as(
      "authenticated",
      a,
      `update public.runs set status='cancelled' where id='${r}'`,
    );
    expect(
      (
        await as(
          "authenticated",
          b,
          `select * from public.notifications where title='Corrida cancelada'`,
        )
      ).rows,
    ).toHaveLength(1);
    await as(
      "authenticated",
      b,
      `delete from public.participants where run_id='${r}' and user_id='${b}'`,
    );
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.participants values('${r}','${b}')`,
      ),
    ).rejects.toThrow();
  });
  test("perfil privado não é exposto a visitantes ou outros corredores", async () => {
    await as(
      "authenticated",
      b,
      `update public.profiles set visibility='private' where id='${b}'`,
    );
    expect(
      (await as("anon", "", `select * from public.profiles where id='${b}'`))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await as(
          "authenticated",
          a,
          `select * from public.profiles where id='${b}'`,
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await as(
          "authenticated",
          b,
          `select * from public.profiles where id='${b}'`,
        )
      ).rows,
    ).toHaveLength(1);
    await as(
      "authenticated",
      b,
      `update public.profiles set visibility='public' where id='${b}'`,
    );
  });
  test("denúncias privadas: somente o dono revisa, autor não forja status", async () => {
    await as(
      "authenticated",
      b,
      `insert into public.reports(reporter_id,group_id,reason) values('${b}','${g}','Relato de teste para revisão')`,
    );
    expect(
      (await as("authenticated", b, `select * from public.reports`)).rows,
    ).toHaveLength(1);
    expect(
      (await as("authenticated", a, `select * from public.reports`)).rows,
    ).toHaveLength(1);
    expect(
      (await as("authenticated", c, `select * from public.reports`)).rows,
    ).toHaveLength(0);
    await as("authenticated", b, `update public.reports set status='resolved'`);
    expect(
      (await db.query(`select * from public.reports where status='open'`)).rows,
    ).toHaveLength(1);
    await as("authenticated", a, `update public.reports set status='resolved'`);
    expect(
      (await db.query(`select * from public.reports where status='resolved'`))
        .rows,
    ).toHaveLength(1);
    await expect(
      as(
        "authenticated",
        b,
        `insert into public.reports(reporter_id,group_id,reason,status) values('${b}','${g}','Relato de teste','resolved')`,
      ),
    ).rejects.toThrow();
  });
  test("dono modera foto e post do próprio grupo; terceiro não pode", async () => {
    await as(
      "authenticated",
      b,
      `insert into storage.objects(bucket_id,name) values('run-photos','${b}/moderacao.jpg')`,
    );
    await as(
      "authenticated",
      b,
      `insert into public.posts(user_id,group_id,body,photo_path) values('${b}','${g}','Registro para moderar','${b}/moderacao.jpg')`,
    );
    expect(
      (
        await as(
          "authenticated",
          c,
          `delete from public.posts where body='Registro para moderar' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await as(
          "authenticated",
          a,
          `delete from storage.objects where name='${b}/moderacao.jpg' returning id`,
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await as(
          "authenticated",
          a,
          `delete from public.posts where body='Registro para moderar' returning id`,
        )
      ).rows,
    ).toHaveLength(1);
  });
  test("terceiro não remove membros, dono pode gerenciar seu grupo", async () => {
    await as(
      "authenticated",
      c,
      `delete from public.memberships where group_id='${g}' and user_id='${b}'`,
    );
    expect(
      (
        await db.query(
          `select * from public.memberships where group_id='${g}' and user_id='${b}'`,
        )
      ).rows,
    ).toHaveLength(1);
    await as(
      "authenticated",
      a,
      `delete from public.memberships where group_id='${g}' and user_id='${b}'`,
    );
    expect(
      (
        await db.query(
          `select * from public.memberships where group_id='${g}' and user_id='${b}'`,
        )
      ).rows,
    ).toHaveLength(0);
  });
});
