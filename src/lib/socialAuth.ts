import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl } from './client';
export type SocialProvider = 'google';
const nextKey = 'correfe.auth.next';
export function safeAuthNext(value: string | null): string {
  if(!value?.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const parsed=new URL(value,'https://correfe.invalid');
    if(parsed.origin!=='https://correfe.invalid' || /^\/(auth|entrar|cadastro|recuperar|nova-senha)(\/|$)/.test(parsed.pathname))return '/';
    return parsed.pathname+parsed.search;
  }catch{return '/';}
}
export function consumeAuthNext(): string {
  try { const value=sessionStorage.getItem(nextKey);sessionStorage.removeItem(nextKey);return safeAuthNext(value); }catch{return '/';}
}
export async function startSocialSignIn(provider: SocialProvider, next: string | null, client: SupabaseClient | null = supabase) {
  if(!client)throw new Error('Não foi possível conectar ao login. Tente novamente mais tarde.');
  const label='Google';
  const response=await fetch(`${supabaseUrl}/auth/v1/settings`,{headers:{apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Não foi possível consultar o login. Tente novamente.');
  const settings=await response.json();
  if(settings.external?.[provider]!==true)throw new Error(`O login com ${label} ainda não está disponível. Por enquanto, entre com e-mail e senha.`);
  try {sessionStorage.setItem(nextKey,safeAuthNext(next));}catch{/* O retorno padrão continua disponível sem sessionStorage. */}
  const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/auth/retorno',queryParams:{prompt:'select_account'}}});
  if(error)throw new Error(`Não foi possível iniciar o login com ${label}. Tente novamente.`);
}
