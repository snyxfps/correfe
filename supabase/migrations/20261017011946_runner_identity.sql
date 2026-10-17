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
