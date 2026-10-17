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
