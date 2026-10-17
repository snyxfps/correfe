-- Metadados apenas para apresentação. Nunca usados para autorização.
create or replace function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id,left(coalesce(
 nullif(trim(new.raw_user_meta_data->>'name'),''),
 nullif(trim(new.raw_user_meta_data->>'full_name'),''),
 'Corredor'),80));
 return new;
end; $$;
revoke all on function private.create_profile() from public,anon,authenticated;
