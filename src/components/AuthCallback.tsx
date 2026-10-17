import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Brand } from './Brand';
import { supabase } from '../lib/client';
import { consumeAuthNext } from '../lib/socialAuth';
export function AuthCallback({go}:{go:(path:string)=>void}) {
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    const params=new URLSearchParams(window.location.hash.slice(1));
    const denied=params.has('error') || new URLSearchParams(window.location.search).has('error');
    (async()=>{
      try {
        if(denied)throw new Error('O login foi cancelado ou recusado. Você pode tentar novamente.');
        if(!supabase)throw new Error('O login não está disponível. Tente novamente mais tarde.');
        // getSession aguarda a inicialização do SDK e o processamento do retorno OAuth.
        const {data,error:sessionError}=await supabase.auth.getSession();
        if(sessionError || !data.session)throw new Error('Não foi possível concluir o login. Volte e tente novamente.');
        if(!active)return;
        const destination=consumeAuthNext();
        if(active){window.history.replaceState(null,'','/auth/retorno');go(destination);}
      }catch(err){if(active){window.history.replaceState(null,'','/auth/retorno');setError(err instanceof Error?err.message:'Não foi possível concluir o login.');}}
    })();
    return()=>{active=false;};
  },[go]);
  return <main className="auth-callback"><Brand/>{error?<div role="alert"><h1>Vamos tentar de novo?</h1><p>{error}</p><button className="button primary" onClick={()=>go('/entrar')}>Voltar para entrar</button></div>:<div role="status"><LoaderCircle className="spin"/><h1>Conectando seu corre…</h1><p>Estamos confirmando seu acesso.</p></div>}</main>;
}
