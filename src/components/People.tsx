import { useEffect, useState } from 'react';
import { ArrowUpRight, LoaderCircle, MapPin } from 'lucide-react';
import { isDemo, supabase } from '../lib/client';
import type { Profile } from '../lib/types';
import { Avatar, Empty } from './ui';
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function People({ profiles, query, open }: { profiles: Profile[]; query: string; open: (id: string) => void }) {
  const [rows,setRows] = useState<Profile[]>([]), [offset,setOffset] = useState(0), [more,setMore] = useState(false), [busy,setBusy] = useState(true), [error,setError] = useState(''), [retry,setRetry] = useState(0);
  useEffect(() => { setOffset(0); },[query]);
  useEffect(() => {
    let active=true;
    setBusy(true); setError('');
    const timer=setTimeout(async () => {
      try {
        let result: Profile[];
        if(isDemo) result=profiles.filter(p=>p.visibility!=='private' && normalized(p.name+' '+p.city).includes(normalized(query.trim()))).sort((a,b)=>a.name.localeCompare(b.name)).slice(offset,offset+21);
        else {
          const response=await supabase!.rpc('search_runners',{p_query:query,p_offset:offset});
          if(response.error) throw response.error;
          result=response.data || [];
        }
        if(active) {setRows(result.slice(0,20));setMore(result.length>20);}
      } catch {if(active) setError('Não foi possível buscar os corredores. Confira a conexão e a migração de busca no Supabase.');}
      finally {if(active) setBusy(false);}
    },300);
    return ()=>{active=false;clearTimeout(timer);};
  },[query,offset,profiles,retry]);
  return <section aria-label="Corredores"><p className="people-hint">Pesquise por nome ou cidade. Somente perfis públicos aparecem aqui.</p>
    {busy ? <p role="status"><LoaderCircle className="spin" size={18}/> Buscando corredores…</p> : error ? <div role="alert"><p>{error}</p><button className="button secondary" onClick={()=>setRetry(v=>v+1)}>Tentar novamente</button></div> : rows.length ? <div className="people-grid">{rows.map(p=><button className="person-card" key={p.id} onClick={()=>open(p.id)}><Avatar name={p.name} path={p.avatar_path} size="large"/><div><h2>{p.name}</h2><p><MapPin size={14}/>{p.city || 'Cidade não informada'}</p><span>{p.pace ? `Ritmo ${p.pace} /km` : 'Cada um no seu ritmo'}</span></div><ArrowUpRight size={19}/></button>)}</div> : <Empty title="Nenhum corredor encontrado">Tente outro nome ou cidade. Perfis privados não aparecem na busca.</Empty>}
    {!busy && !error && (offset>0 || more) && <div className="people-pagination"><button className="button secondary" disabled={!offset} onClick={()=>setOffset(v=>Math.max(0,v-20))}>Anterior</button><span>Página {offset/20+1}</span><button className="button secondary" disabled={!more} onClick={()=>setOffset(v=>v+20)}>Próxima</button></div>}
  </section>;
}
export function RunnerProfile({id,profiles}: {id:string;profiles:Profile[]}) {
  const [profile,setProfile]=useState<Profile|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setBusy(true);setError(false);setProfile(null);
    (async()=>{try {
      let result:Profile|null=null;
      if(isDemo) result=profiles.find(p=>p.id===id && p.visibility!=='private') || null;
      else if(/^[0-9a-f-]{36}$/i.test(id)) {
        const response=await supabase!.from('profiles').select('id,name,city,bio,pace,avatar_path,shoes').eq('id',id).eq('visibility','public').maybeSingle();
        if(response.error) throw response.error;
        result=response.data;
      }
      if(active)setProfile(result);
    }catch{if(active)setError(true);}finally{if(active)setBusy(false);}})();
    return()=>{active=false;};
  },[id,profiles,retry]);
  if(busy)return <p role="status">Carregando perfil…</p>;
  if(error)return <div role="alert"><p>Não foi possível carregar o perfil.</p><button className="button secondary" onClick={()=>setRetry(v=>v+1)}>Tentar novamente</button></div>;
  if(!profile)return <Empty title="Perfil indisponível">Este perfil é privado ou não foi encontrado.</Empty>;
  return <article className="runner-public"><Avatar name={profile.name} path={profile.avatar_path} size="large"/><p className="eyebrow">CORREDOR · CORREFÉ</p><h1>{profile.name}</h1><p><MapPin size={16}/> {profile.city || 'Cidade não informada'}</p><p>{profile.bio || 'O próximo encontro pode começar com um corre.'}</p>{profile.shoes && <p className="runner-shoes">Meu tênis · {profile.shoes}</p>}<strong>{profile.pace ? `Ritmo ${profile.pace} /km` : 'Cada um no seu ritmo'}</strong></article>;
}
