import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const isDemo: boolean = false;
const validUrl = (() => {
  try {
    return ["http:", "https:"].includes(new URL(url || "").protocol);
  } catch {
    return false;
  }
})();
export const configError =
  !isDemo && (!url || !key || !validUrl)
    ? "Configuração incompleta. Preencha a URL e a chave pública do Supabase."
    : null;
export const supabase =
  !isDemo && !configError ? createClient(url!, key!) : null;
export function photoUrl(path: string | null) {
  if (!path) return undefined;
  if (isDemo) return path;
  return supabase?.storage.from("run-photos").getPublicUrl(path).data.publicUrl;
}
