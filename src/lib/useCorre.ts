import { useCallback, useEffect, useState, useRef } from "react";
import { configError, isDemo, supabase } from "./client";
import { demoUser, makeDemo } from "./demo";
import type { Data, Profile, Run, Group } from "./types";
const empty: Data = {
  notifications: [],
  reports: [],
  profiles: [],
  groups: [],
  memberships: [],
  runs: [],
  participants: [],
  posts: [],
  likes: [],
  products: [],
  orders: [],
};
export function useCorre() {
  const [data, setData] = useState<Data>(() => (isDemo ? makeDemo() : empty));
  const [userId, setUserId] = useState<string | null>(isDemo ? demoUser : null);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(configError);
  const loadVersion = useRef(0);
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const version = ++loadVersion.current;
    setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getSession();
      if (authError) throw authError;
      const entries = await Promise.all(
        (Object.keys(empty) as (keyof Data)[]).map(async (table) => {
          if (
            ["orders", "notifications", "reports"].includes(table) &&
            !authData.session
          )
            return [table, []];
          const result = await supabase!.from(table).select("*").limit(500);
          if (result.error) throw result.error;
          return [table, result.data];
        }),
      );
      if (version === loadVersion.current)
        setData(Object.fromEntries(entries) as Data);
    } catch {
      if (version === loadVersion.current)
        setError(
          "Não foi possível carregar seus dados. Verifique a conexão e se a migração foi aplicada.",
        );
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data: result, error: authError }) => {
        if (!active) return;
        if (authError) setError("Não foi possível recuperar sua sessão.");
        setUserId(result.session?.user.id ?? null);
      })
      .catch(() => {
        if (active) setError("Falha de conexão com a autenticação.");
      });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setUserId(session?.user.id ?? null);
      },
    );
    void refresh();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [refresh]);
  useEffect(() => {
    if (supabase) void refresh();
  }, [userId, refresh]);
  async function insert(table: keyof Data, row: Record<string, unknown>) {
    if (!userId) throw new Error("Entre na sua conta para continuar.");
    if (isDemo) {
      const item = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...row,
      };
      setData((d) => ({ ...d, [table]: [...d[table], item] }));
      return item.id;
    }
    const { data: result, error: err } = await supabase!
      .from(table)
      .insert(row)
      .select()
      .single();
    if (err)
      throw new Error(
        "Não foi possível salvar. Verifique sua conexão e permissão neste grupo.",
      );
    await refresh();
    return result.id as string;
  }
  async function toggle(
    table: "memberships" | "participants" | "likes",
    key: string,
    id: string,
  ) {
    if (!userId) throw new Error("Entre na sua conta para continuar.");
    if (
      table === "participants" &&
      !data.participants.some((p) => p.run_id === id && p.user_id === userId)
    ) {
      const run = data.runs.find((r) => r.id === id);
      if (
        !run ||
        run.status === "cancelled" ||
        new Date(run.starts_at) <= new Date()
      )
        throw new Error("Esta corrida já começou.");
    }
    const exists = data[table].some(
      (row) =>
        (row as unknown as Record<string, string>)[key] === id &&
        row.user_id === userId,
    );
    if (isDemo) {
      setData((d) => ({
        ...d,
        [table]: exists
          ? d[table].filter(
              (row) =>
                !(
                  (row as unknown as Record<string, string>)[key] === id &&
                  row.user_id === userId
                ),
            )
          : [...d[table], { [key]: id, user_id: userId }],
      }));
      return;
    }
    const result = exists
      ? await supabase!.from(table).delete().eq(key, id).eq("user_id", userId)
      : await supabase!.from(table).insert({ [key]: id, user_id: userId });
    if (result.error)
      throw new Error(
        "Não foi possível atualizar. Para participar de uma corrida, entre primeiro no grupo.",
      );
    await refresh();
  }
  async function saveProfile(profile: Profile) {
    if (isDemo) {
      setData((d) => ({
        ...d,
        profiles: d.profiles.map((p) => (p.id === profile.id ? profile : p)),
      }));
      return;
    }
    const { error: err } = await supabase!.from("profiles").upsert(profile);
    if (err) throw new Error("Não foi possível salvar seu perfil.");
    await refresh();
  }
  async function upload(file: File) {
    if (!userId) throw new Error("Entre para enviar uma foto.");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error("Escolha uma foto JPG, PNG ou WebP de até 5 MB.");
    if (isDemo) return URL.createObjectURL(file);
    const path = `${userId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error: err } = await supabase!.storage
      .from("run-photos")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (err)
      throw new Error("Não foi possível enviar a foto. Tente novamente.");
    return path;
  }
  async function updateRun(id: string, patch: Partial<Run>) {
    if (!userId) throw new Error("Entre para organizar encontros.");
    const run = data.runs.find((r) => r.id === id);
    if (
      !run ||
      !(
        run.creator_id === userId ||
        data.groups.some((g) => g.id === run.group_id && g.owner_id === userId)
      )
    )
      throw new Error("Você não organiza esta corrida.");
    if (new Date(run.starts_at) <= new Date())
      throw new Error("Encontros já iniciados não podem ser alterados.");
    if (isDemo) {
      setData((d) => ({
        ...d,
        runs: d.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        notifications: d.participants.some(
          (p) => p.run_id === id && p.user_id === userId,
        )
          ? [
              {
                id: crypto.randomUUID(),
                user_id: userId,
                run_id: id,
                title:
                  patch.status === "cancelled"
                    ? "Corrida cancelada"
                    : "Encontro atualizado",
                body: patch.title || run.title,
                created_at: new Date().toISOString(),
                read_at: null,
              },
              ...d.notifications,
            ]
          : d.notifications,
      }));
      return;
    }
    const { data: rows, error: e } = await supabase!
      .from("runs")
      .update(patch)
      .eq("id", id)
      .select("id");
    if (e || !rows?.length)
      throw new Error("Não foi possível atualizar a corrida.");
    await refresh();
  }
  async function updateGroup(id: string, patch: Partial<Group>) {
    if (!data.groups.some((g) => g.id === id && g.owner_id === userId))
      throw new Error("Somente o organizador pode editar o grupo.");
    if (isDemo) {
      setData((d) => ({
        ...d,
        groups: d.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      }));
      return;
    }
    const { data: rows, error: e } = await supabase!
      .from("groups")
      .update(patch)
      .eq("id", id)
      .select("id");
    if (e || !rows?.length) throw new Error("Não foi possível salvar o grupo.");
    await refresh();
  }
  async function removeParticipant(runId: string, id: string) {
    if (isDemo) {
      setData((d) => ({
        ...d,
        participants: d.participants.filter(
          (p) => !(p.run_id === runId && p.user_id === id),
        ),
      }));
      return;
    }
    const { error: e } = await supabase!
      .from("participants")
      .delete()
      .eq("run_id", runId)
      .eq("user_id", id);
    if (e) throw new Error("Não foi possível remover a presença.");
    await refresh();
  }
  async function removeMember(groupId: string, id: string) {
    if (!data.groups.some((g) => g.id === groupId && g.owner_id === userId))
      throw new Error("Somente o dono gerencia membros.");
    if (id === userId) throw new Error("Use Sair do grupo para sair.");
    const runs = data.runs
      .filter((r) => r.group_id === groupId)
      .map((r) => r.id);
    if (isDemo) {
      setData((d) => ({
        ...d,
        memberships: d.memberships.filter(
          (m) => !(m.group_id === groupId && m.user_id === id),
        ),
        participants: d.participants.filter(
          (p) => !(runs.includes(p.run_id) && p.user_id === id),
        ),
      }));
      return;
    }
    if (runs.length) {
      const { error: e } = await supabase!
        .from("participants")
        .delete()
        .in("run_id", runs)
        .eq("user_id", id);
      if (e) throw new Error("Não foi possível remover as inscrições.");
    }
    const { error: e } = await supabase!
      .from("memberships")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", id);
    if (e) throw new Error("Não foi possível remover o membro.");
    await refresh();
  }
  async function removePost(id: string) {
    const p = data.posts.find((p) => p.id === id);
    if (
      !p ||
      !(
        p.user_id === userId ||
        data.groups.some((g) => g.id === p.group_id && g.owner_id === userId)
      )
    )
      throw new Error("Você não pode remover esta publicação.");
    if (isDemo) {
      setData((d) => ({
        ...d,
        posts: d.posts.filter((p) => p.id !== id),
        likes: d.likes.filter((l) => l.post_id !== id),
        reports: d.reports.map((r) =>
          r.post_id === id ? { ...r, post_id: null } : r,
        ),
      }));
      return;
    }
    if (p.photo_path) {
      const { error: e } = await supabase!.storage
        .from("run-photos")
        .remove([p.photo_path]);
      if (e)
        throw new Error(
          "Não foi possível remover a foto. A publicação foi mantida para tentar novamente.",
        );
    }
    const { data: rows, error: e } = await supabase!
      .from("posts")
      .delete()
      .eq("id", id)
      .select("id");
    if (e || !rows?.length)
      throw new Error("Não foi possível remover a publicação.");
    await refresh();
  }
  async function markRead(id: string) {
    if (isDemo) {
      setData((d) => ({
        ...d,
        notifications: d.notifications.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      }));
      return;
    }
    const { error: e } = await supabase!
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (e) throw new Error("Não foi possível atualizar o aviso.");
    await refresh();
  }
  async function resolveReport(id: string) {
    if (isDemo) {
      setData((d) => ({
        ...d,
        reports: d.reports.map((r) =>
          r.id === id ? { ...r, status: "resolved" } : r,
        ),
      }));
      return;
    }
    const { error: e } = await supabase!
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", id);
    if (e) throw new Error("Não foi possível resolver a denúncia.");
    await refresh();
  }
  async function deleteAccount() {
    if (isDemo) {
      setData(makeDemo());
      setUserId(null);
      return;
    }
    const { data: result, error: e } = await supabase!.functions.invoke(
      "delete-account",
      { body: { confirmation: "EXCLUIR" } },
    );
    if (e || !result?.deleted)
      throw new Error(
        "Não foi possível excluir. A função delete-account precisa estar configurada; tente novamente ou contate o responsável.",
      );
    await supabase!.auth.signOut();
    setUserId(null);
    setData(empty);
  }
  function enterDemo() {
    if (isDemo) setUserId(demoUser);
  }
  return {
    updateRun,
    updateGroup,
    removeParticipant,
    removeMember,
    removePost,
    markRead,
    resolveReport,
    deleteAccount,
    enterDemo,
    data,
    userId,
    loading,
    error,
    refresh,
    insert,
    toggle,
    saveProfile,
    upload,
  };
}
