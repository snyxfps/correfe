// Deploy separado e opcional. Nenhuma chave administrativa é enviada ao navegador.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
export async function handleDeleteAccount(request: Request) {
  const allowedOrigin =
    Deno.env.get("ALLOWED_ORIGIN") || "http://127.0.0.1:5173";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization,x-client-info,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
  const reply = (status: number, value: unknown) =>
    new Response(JSON.stringify(value), { status, headers });
  if (request.headers.get("origin") !== allowedOrigin)
    return reply(403, { error: "Origem não permitida" });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST")
    return reply(405, { error: "Método inválido" });
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) return reply(401, { error: "Entre novamente" });
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return reply(503, { error: "Serviço não configurado" });
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: authError } = await admin.auth.getUser(token);
  if (authError || !identity.user)
    return reply(401, { error: "Sessão inválida" });
  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: "Confirmação obrigatória" });
  }
  if (body.confirmation !== "EXCLUIR")
    return reply(400, { error: "Confirmação obrigatória" });
  const id = identity.user.id; // Sempre do token validado. Nunca do corpo da requisição.
  try {
    const paths = new Set<string>();
    const groups: { id: string }[] = [];
    for (let offset = 0; ; offset += 200) {
      const { data, error } = await admin
        .from("groups")
        .select("id")
        .eq("owner_id", id)
        .order("id")
        .range(offset, offset + 199);
      if (error) throw error;
      groups.push(...(data || []));
      if ((data?.length || 0) < 200) break;
    }
    // Recolhe imagens dos registros que serão removidos em cascata, inclusive grupos próprios.
    const conditions = [
      `user_id.eq.${id}`,
      ...(groups || []).map((g) => `group_id.eq.${g.id}`),
    ];
    for (let i = 0; i < conditions.length; i += 50) {
      for (let offset = 0; ; offset += 200) {
        const { data, error } = await admin
          .from("posts")
          .select("photo_path")
          .or(conditions.slice(i, i + 50).join(","))
          .order("id")
          .range(offset, offset + 199);
        if (error) throw error;
        for (const p of data || []) if (p.photo_path) paths.add(p.photo_path);
        if ((data?.length || 0) < 200) break;
      }
    }
    // Inclui uploads próprios ainda não associados a um post.
    const folders = [id];
    for (let i = 0; i < folders.length; i++) {
      if (folders.length > 10000) throw new Error("Limite de pastas excedido");
      const prefix = folders[i];
      for (let offset = 0; ; offset += 200) {
        const { data, error } = await admin.storage
          .from("run-photos")
          .list(prefix, {
            limit: 200,
            offset,
            sortBy: { column: "name", order: "asc" },
          });
        if (error) throw error;
        for (const file of data || []) {
          if (file.id) paths.add(`${prefix}/${file.name}`);
          else folders.push(`${prefix}/${file.name}`);
        }
        if ((data?.length || 0) < 200) break;
      }
    }
    const ownedGroups = new Set(groups.map((g) => g.id));
    const foreignPaths = [...paths].filter(
      (path) => !path.startsWith(id + "/"),
    );
    for (let i = 0; i < foreignPaths.length; i += 100) {
      for (let offset = 0; ; offset += 200) {
        const { data, error } = await admin
          .from("posts")
          .select("photo_path,group_id")
          .in("photo_path", foreignPaths.slice(i, i + 100))
          .neq("user_id", id)
          .order("id")
          .range(offset, offset + 199);
        if (error) throw error;
        for (const p of data || [])
          if (p.photo_path && !ownedGroups.has(p.group_id))
            paths.delete(p.photo_path);
        if ((data?.length || 0) < 200) break;
      }
    }
    const files = [...paths];
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await admin.storage
        .from("run-photos")
        .remove(files.slice(i, i + 100));
      if (error) throw error;
    }
    const { error: revokeError } = await admin.auth.admin.signOut(
      token,
      "global",
    );
    if (revokeError) throw revokeError;
    const { error: deleteError } = await admin.auth.admin.deleteUser(id);
    if (deleteError) throw deleteError;
    return reply(200, { deleted: true });
  } catch {
    return reply(500, {
      error:
        "Não foi possível concluir. Algumas fotos podem ter sido removidas. Entre novamente e tente concluir a exclusão.",
    });
  }
}
if (import.meta.main) Deno.serve(handleDeleteAccount);
