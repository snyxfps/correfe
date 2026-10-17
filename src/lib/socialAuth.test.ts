import { afterEach, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeAuthNext, startSocialSignIn, consumeAuthNext } from './socialAuth';
vi.mock('./client',()=>({supabase:null,supabaseUrl:'https://example.supabase.co'}));
afterEach(()=>{vi.unstubAllGlobals();});
function browser(){
 const entries=new Map<string,string>();
 vi.stubGlobal('sessionStorage',{getItem:(key:string)=>entries.get(key)||null,setItem:(key:string,value:string)=>entries.set(key,value),removeItem:(key:string)=>entries.delete(key)});
 vi.stubGlobal('window',{location:{origin:'https://correfe.example'}});
}
describe('Login social',()=>{
 test('retorno só permite navegação interna e impede loops de autenticação',()=>{
  for(const path of ['https://evil.example','//evil.example','/\\evil.example','/auth/retorno','/entrar?next=/']) expect(safeAuthNext(path)).toBe('/');
  expect(safeAuthNext('/corridas/123?origem=convite')).toBe('/corridas/123?origem=convite');
 });
 test('provedor desligado não inicia redirecionamento',async()=>{
  browser();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({external:{google:false}})}));
  const signInWithOAuth=vi.fn();
  await expect(startSocialSignIn('google','/perfil',{auth:{signInWithOAuth}} as unknown as SupabaseClient)).rejects.toThrow('ainda não está disponível');
  expect(signInWithOAuth).not.toHaveBeenCalled();
 });
 test.each(['google'] as const)('inicia %s com callback local e consome destino apenas uma vez',async(provider)=>{
  browser();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({external:{google:true}})}));
  const signInWithOAuth=vi.fn().mockResolvedValue({error:null});
  await startSocialSignIn(provider,'/grupos/123',{auth:{signInWithOAuth}} as unknown as SupabaseClient);
  expect(signInWithOAuth).toHaveBeenCalledWith({provider,options:{redirectTo:'https://correfe.example/auth/retorno',queryParams:{prompt:'select_account'}}});
  expect(consumeAuthNext()).toBe('/grupos/123');expect(consumeAuthNext()).toBe('/');
 });
 test('falha de rede não inicia login',async()=>{
  browser();vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  const signInWithOAuth=vi.fn();
  await expect(startSocialSignIn('google','/',{auth:{signInWithOAuth}} as unknown as SupabaseClient)).rejects.toThrow();
  expect(signInWithOAuth).not.toHaveBeenCalled();
 });
});
