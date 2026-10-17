-- CORREFÉ: instalação inicial em projeto Supabase NOVO.
-- Supabase > SQL Editor > New query > colar TODO este arquivo > Run.
-- Se você já executou migrações anteriores, execute somente as que faltam, em ordem.
-- Não contém dados fictícios nem credenciais. Execute uma vez.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.profiles') IS NOT NULL THEN
  RAISE EXCEPTION 'Base já instalada ou parcial: execute somente as migrações pendentes de supabase/migrations, em ordem.';
 END IF;
END $$;
-- Arquivo: 20261016235709_initial_corre.sql
-- CORRE MVP: todos os grupos, perfis, encontros e registros são públicos.
-- E-mails permanecem em auth.users. Pedidos só são lidos pelo comprador e dono da loja.
create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 80),
 city text not null default '' check (length(city)<=120),
 bio text not null default '' check (length(bio)<=500),
 pace text not null default '' check (length(pace)<=30)
);
create table public.groups (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),
 city text not null check(length(trim(city)) between 1 and 120),
 description text not null default '' check(length(description)<=1000),
 color text not null default '#ededed'
);
create table public.memberships (
 group_id uuid not null references public.groups(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(group_id,user_id)
);
create table public.runs (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.groups(id) on delete cascade,
 creator_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),
 starts_at timestamptz not null,
 start_point text not null check(length(trim(start_point)) between 1 and 240),
 end_point text not null check(length(trim(end_point)) between 1 and 240),
 distance numeric(5,1) not null check(distance>0 and distance<=300),
 pace text not null check(length(pace) between 1 and 30),
 description text not null default '' check(length(description)<=1000),
 unique(id,group_id)
);
create table public.participants (
 run_id uuid not null references public.runs(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(run_id,user_id)
);
create table public.posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 group_id uuid not null references public.groups(id) on delete cascade,
 run_id uuid,
 body text not null check(length(trim(body)) between 1 and 2000),
 photo_path text,
 created_at timestamptz not null default now(),
 foreign key(run_id,group_id) references public.runs(id,group_id) on delete cascade
);
create table public.likes (
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(post_id,user_id)
);
create table public.products (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.groups(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),
 description text not null default '' check(length(description)<=1000),
 price_cents integer not null check(price_cents between 1 and 1000000),
 category text not null check(category in ('Camiseta','Boné','Meia')),
 active boolean not null default true
);
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete restrict,
 quantity integer not null check(quantity between 1 and 10),
 size text not null check(size in ('P','M','G','GG','Único')),
 total_cents integer not null,
 status text not null default 'requested' check(status='requested'),
 created_at timestamptz not null default now()
);

create index groups_owner_idx on public.groups(owner_id);
create index memberships_user_idx on public.memberships(user_id);
create index runs_group_date_idx on public.runs(group_id,starts_at);
create index runs_creator_idx on public.runs(creator_id);
create index runs_date_idx on public.runs(starts_at);
create index participants_user_idx on public.participants(user_id);
create index posts_group_date_idx on public.posts(group_id,created_at desc);
create index posts_user_idx on public.posts(user_id);
create index posts_run_group_idx on public.posts(run_id,group_id);
create index likes_user_idx on public.likes(user_id);
create index products_group_idx on public.products(group_id);
create index orders_user_idx on public.orders(user_id);
create index orders_product_idx on public.orders(product_id);

-- Trigger privilegiado restrito ao schema não exposto; não usa metadados para autorização.
create function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Corredor'),80));
 return new;
end; $$;
revoke all on function private.create_profile() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();

-- Preço sempre calculado a partir do catálogo, mesmo que o cliente envie outro total.
create function private.price_order() returns trigger language plpgsql security invoker set search_path='' as $$
declare item public.products%rowtype;
begin
 select * into item from public.products where id=new.product_id and active=true;
 if not found then raise exception 'Produto indisponível'; end if;
 if (item.category='Camiseta' and new.size not in ('P','M','G','GG')) or (item.category<>'Camiseta' and new.size<>'Único') then raise exception 'Tamanho inválido'; end if;
 new.total_cents:=item.price_cents*new.quantity;
 new.status:='requested'; new.created_at:=now();
 return new;
end; $$;
revoke all on function private.price_order() from public,anon,authenticated;
create trigger calculate_order before insert on public.orders for each row execute function private.price_order();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.runs enable row level security;
alter table public.participants enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Remover inclusive privilégios herdados dos defaults do Supabase.
revoke all on public.profiles,public.groups,public.memberships,public.runs,public.participants,public.posts,public.likes,public.products,public.orders from anon,authenticated;
-- Menor conjunto de privilégios necessário para as telas deste MVP.
grant usage on schema public to anon,authenticated;
grant select on public.profiles,public.groups,public.memberships,public.runs,public.participants,public.posts,public.likes,public.products to anon,authenticated;
grant select on public.orders to authenticated;
grant insert,update on public.profiles to authenticated;
grant insert on public.groups,public.runs,public.posts,public.products,public.orders to authenticated;
grant insert,delete on public.memberships,public.participants,public.likes to authenticated;

create policy profiles_read on public.profiles for select to anon,authenticated using(true);
create policy profiles_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy groups_read on public.groups for select to anon,authenticated using(true);
create policy groups_insert on public.groups for insert to authenticated with check(owner_id=(select auth.uid()));
create policy memberships_read on public.memberships for select to anon,authenticated using(true);
create policy memberships_insert on public.memberships for insert to authenticated with check(user_id=(select auth.uid()));
create policy memberships_delete on public.memberships for delete to authenticated using(user_id=(select auth.uid()));
create policy runs_read on public.runs for select to anon,authenticated using(true);
create policy runs_insert on public.runs for insert to authenticated with check(
 creator_id=(select auth.uid()) and starts_at>now() and exists(select 1 from public.groups g where g.id=group_id and (g.owner_id=(select auth.uid()) or exists(select 1 from public.memberships m where m.group_id=g.id and m.user_id=(select auth.uid()))))
);
create policy participants_read on public.participants for select to anon,authenticated using(true);
create policy participants_insert on public.participants for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.runs r where r.id=run_id and r.starts_at>now() and exists(select 1 from public.memberships m where m.group_id=r.group_id and m.user_id=(select auth.uid())))
);
create policy participants_delete on public.participants for delete to authenticated using(user_id=(select auth.uid()));
create policy posts_read on public.posts for select to anon,authenticated using(true);
create policy posts_insert on public.posts for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.memberships m where m.group_id=posts.group_id and m.user_id=(select auth.uid()))
 and (run_id is null or exists(select 1 from public.participants p join public.runs r on r.id=p.run_id where p.run_id=posts.run_id and p.user_id=(select auth.uid()) and r.starts_at<=now()))
 and (photo_path is null or (photo_path like ((select auth.uid())::text || '/%') and exists(select 1 from storage.objects o where o.bucket_id='run-photos' and o.name=photo_path)))
);
create policy likes_read on public.likes for select to anon,authenticated using(true);
create policy likes_insert on public.likes for insert to authenticated with check(user_id=(select auth.uid()));
create policy likes_delete on public.likes for delete to authenticated using(user_id=(select auth.uid()));
create policy products_read on public.products for select to anon,authenticated using(true);
create policy products_insert on public.products for insert to authenticated with check(exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
create policy orders_read on public.orders for select to authenticated using(
 user_id=(select auth.uid()) or exists(select 1 from public.products p join public.groups g on g.id=p.group_id where p.id=product_id and g.owner_id=(select auth.uid()))
);
create policy orders_insert on public.orders for insert to authenticated with check(user_id=(select auth.uid()));

-- Álbum público por design, escrita em pastas do próprio usuário. Não há upsert.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('run-photos','run-photos',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy corre_photos_read on storage.objects for select to anon,authenticated using(bucket_id='run-photos');
create policy corre_photos_insert on storage.objects for insert to authenticated with check(
 bucket_id='run-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy corre_photos_delete on storage.objects for delete to authenticated using(
 bucket_id='run-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
);

-- Arquivo: 20261017000754_community_growth.sql
-- Evolução incremental: descoberta, organização, avisos e moderação.
alter table public.profiles add column visibility text not null default 'public' check(visibility in ('public','private'));
alter table public.groups add column rules text not null default '' check(length(rules)<=2000), add column contact text not null default '' check(length(contact)<=240);
alter table public.runs add column cancellation_reason text not null default '' check(length(cancellation_reason)<=500), add column neighborhood text not null default '' check(length(neighborhood)<=100), add column beginner_friendly boolean not null default false, add column no_one_left_behind boolean not null default false, add column duration_minutes integer not null default 60 check(duration_minutes between 10 and 1440), add column status text not null default 'scheduled' check(status in ('scheduled','cancelled'));
alter table public.orders drop constraint orders_product_id_fkey;
alter table public.orders add constraint orders_product_id_fkey foreign key(product_id) references public.products(id) on delete cascade;
create index groups_city_idx on public.groups(city);
create index runs_neighborhood_idx on public.runs(neighborhood);

drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to anon,authenticated using(visibility='public' or id=(select auth.uid()));
grant update(name,city,description,rules,contact) on public.groups to authenticated;
create policy groups_update on public.groups for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
grant update(title,starts_at,start_point,end_point,distance,pace,description,neighborhood,beginner_friendly,no_one_left_behind,duration_minutes,status,cancellation_reason) on public.runs to authenticated;
create policy runs_update on public.runs for update to authenticated using(
 starts_at>now() and (creator_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())))
) with check(starts_at>now() and (creator_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid()))));
-- Somente inscrições ativas e futuras; não existe inscrição em corrida cancelada.
drop policy participants_insert on public.participants;
create policy participants_insert on public.participants for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.runs r where r.id=run_id and r.status='scheduled' and r.starts_at>now() and exists(select 1 from public.memberships m where m.group_id=r.group_id and m.user_id=(select auth.uid())))
);
drop policy participants_delete on public.participants;
create policy participants_delete on public.participants for delete to authenticated using(
 user_id=(select auth.uid()) or exists(select 1 from public.runs r join public.groups g on g.id=r.group_id where r.id=run_id and (r.creator_id=(select auth.uid()) or g.owner_id=(select auth.uid())))
);
drop policy memberships_delete on public.memberships;
create policy memberships_delete on public.memberships for delete to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
-- O organizador pode remover conteúdo de sua comunidade; o autor pode remover o próprio.
grant delete on public.posts to authenticated;
create policy posts_delete on public.posts for delete to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
drop policy corre_photos_delete on storage.objects;
create policy corre_photos_delete on storage.objects for delete to authenticated using(bucket_id='run-photos' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.posts p join public.groups g on g.id=p.group_id where p.photo_path=storage.objects.name and g.owner_id=(select auth.uid()))));
drop policy corre_photos_insert on storage.objects;
create policy corre_photos_insert on storage.objects for insert to authenticated with check(bucket_id='run-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid())));
-- Registro pós-corrida exige que o período previsto tenha terminado.
drop policy posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.memberships m where m.group_id=posts.group_id and m.user_id=(select auth.uid()))
 and (run_id is null or exists(select 1 from public.participants p join public.runs r on r.id=p.run_id where p.run_id=posts.run_id and p.user_id=(select auth.uid()) and r.status='scheduled' and r.starts_at+make_interval(mins=>r.duration_minutes)<=now()))
 and (photo_path is null or (photo_path like ((select auth.uid())::text || '/%') and exists(select 1 from storage.objects o where o.bucket_id='run-photos' and o.name=photo_path)))
);

create table public.notifications(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 run_id uuid not null references public.runs(id) on delete cascade, title text not null, body text not null,
 created_at timestamptz not null default now(), read_at timestamptz
);
create index notifications_user_date_idx on public.notifications(user_id,created_at desc);
create index notifications_run_idx on public.notifications(run_id);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon,authenticated;
grant select,update(read_at) on public.notifications to authenticated;
create policy notifications_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- Trigger interno privilegiado apenas para entregar avisos aos participantes.
create function private.notify_run_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return new; end if;
 if row(old.title,old.starts_at,old.start_point,old.end_point,old.status,old.description,old.pace,old.distance,old.duration_minutes,old.neighborhood,old.beginner_friendly,old.no_one_left_behind,old.cancellation_reason) is distinct from row(new.title,new.starts_at,new.start_point,new.end_point,new.status,new.description,new.pace,new.distance,new.duration_minutes,new.neighborhood,new.beginner_friendly,new.no_one_left_behind,new.cancellation_reason) then
  insert into public.notifications(user_id,run_id,title,body)
  select p.user_id,new.id,case when new.status='cancelled' then 'Corrida cancelada' else 'Encontro atualizado' end,new.title||' — confira os detalhes atualizados antes de sair.' from public.participants p where p.run_id=new.id;
 end if; return new;
end; $$;
revoke all on function private.notify_run_change() from public,anon,authenticated;
create trigger run_changed after update on public.runs for each row execute function private.notify_run_change();

create table public.reports(
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade,
 group_id uuid not null references public.groups(id) on delete cascade, post_id uuid references public.posts(id) on delete set null,
 reason text not null check(length(trim(reason)) between 10 and 1000), status text not null default 'open' check(status in ('open','resolved')),
 created_at timestamptz not null default now()
);
create index reports_reporter_idx on public.reports(reporter_id);
create index reports_group_idx on public.reports(group_id);
create index reports_post_idx on public.reports(post_id);
alter table public.reports enable row level security;
revoke all on public.reports from anon,authenticated;
grant select,insert,update(status) on public.reports to authenticated;
create policy reports_read on public.reports for select to authenticated using(reporter_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
create policy reports_insert on public.reports for insert to authenticated with check(reporter_id=(select auth.uid()) and status='open' and (post_id is null or exists(select 1 from public.posts p where p.id=post_id and p.group_id=reports.group_id)));
create policy reports_update on public.reports for update to authenticated using(exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid()))) with check(exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));

-- Arquivo: 20261017004237_runner_search.sql
-- Busca pública paginada, respeitando RLS e sem retornar e-mails.
create index profiles_public_name_idx on public.profiles(lower(name),id) where visibility='public';
create function public.search_runners(p_query text default '', p_offset integer default 0)
returns table(id uuid,name text,city text,bio text,pace text)
language sql stable security invoker set search_path='' as $$
 select p.id,p.name,p.city,p.bio,p.pace from public.profiles p
 where p.visibility='public' and position(
 translate(lower(left(trim(coalesce(p_query,'')),80)), 'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')
 in translate(lower(p.name || ' ' || p.city), 'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')
 )>0 order by lower(p.name),p.id limit 21 offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.search_runners(text,integer) from public;
grant execute on function public.search_runners(text,integer) to anon,authenticated;
-- Recupera perfis de contas criadas antes da instalação do gatilho.
insert into public.profiles(id,name)
 select id,left(coalesce(nullif(trim(raw_user_meta_data->>'name'),''),'Corredor'),80)
 from auth.users on conflict(id) do nothing;

-- Arquivo: 20261017011946_runner_identity.sql
alter table public.profiles add column avatar_path text, add column shoes text not null default '' check(length(shoes)<=120);
alter table public.profiles add constraint avatar_own_folder check(avatar_path is null or (avatar_path like id::text || '/%' and length(avatar_path)<=200));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy avatars_read on storage.objects for select to anon,authenticated using(
 bucket_id='avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.profiles p where p.avatar_path=storage.objects.name and p.visibility='public'))
);
create policy avatars_insert on storage.objects for insert to authenticated with check(
 bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid()))
);
create policy avatars_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop function public.search_runners(text,integer);
create function public.search_runners(p_query text default '', p_offset integer default 0)
returns table(id uuid,name text,city text,bio text,pace text,avatar_path text,shoes text)
language sql stable security invoker set search_path='' as $$
 select p.id,p.name,p.city,p.bio,p.pace,p.avatar_path,p.shoes from public.profiles p
 where p.visibility='public' and position(
 translate(lower(left(trim(coalesce(p_query,'')),80)), 'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')
 in translate(lower(p.name || ' ' || p.city), 'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')
 )>0 order by lower(p.name),p.id limit 21 offset greatest(coalesce(p_offset,0),0);
$$;
revoke all on function public.search_runners(text,integer) from public;
grant execute on function public.search_runners(text,integer) to anon,authenticated;

COMMIT;
