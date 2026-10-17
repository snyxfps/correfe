-- Evolução incremental: descoberta, organização, avisos e moderação.
alter table public.profiles add column visibility text not null default 'public' check(visibility in ('public','private'));
alter table public.groups add column rules text not null default '' check(length(rules)<=2000), add column contact text not null default '' check(length(contact)<=240);
alter table public.runs add column cancellation_reason text not null default '' check(length(cancellation_reason)<=500), add column neighborhood text not null default '' check(length(neighborhood)<=100), add column beginner_friendly boolean not null default false, add column no_one_left_behind boolean not null default false, add column duration_minutes integer not null default 60 check(duration_minutes between 10 and 1440), add column status text not null default 'scheduled' check(status in ('scheduled','cancelled'));
alter table public.orders drop constraint orders_product_id_fkey;
alter table public.orders add constraint orders_product_id_fkey foreign key(product_id) references public.products(id) on delete cascade;
create index groups_city_idx on public.groups(city);
create index runs_neighborhood_idx on public.runs(neighborhood);

drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to anon,authenticated using(visibility='public' or id=(select auth.uid()));
grant update(name,city,description,rules,contact) on public.groups to authenticated;
create policy groups_update on public.groups for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
grant update(title,starts_at,start_point,end_point,distance,pace,description,neighborhood,beginner_friendly,no_one_left_behind,duration_minutes,status,cancellation_reason) on public.runs to authenticated;
create policy runs_update on public.runs for update to authenticated using(
 starts_at>now() and (creator_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())))
) with check(starts_at>now() and (creator_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid()))));
-- Somente inscrições ativas e futuras; não existe inscrição em corrida cancelada.
drop policy participants_insert on public.participants;
create policy participants_insert on public.participants for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.runs r where r.id=run_id and r.status='scheduled' and r.starts_at>now() and exists(select 1 from public.memberships m where m.group_id=r.group_id and m.user_id=(select auth.uid())))
);
drop policy participants_delete on public.participants;
create policy participants_delete on public.participants for delete to authenticated using(
 user_id=(select auth.uid()) or exists(select 1 from public.runs r join public.groups g on g.id=r.group_id where r.id=run_id and (r.creator_id=(select auth.uid()) or g.owner_id=(select auth.uid())))
);
drop policy memberships_delete on public.memberships;
create policy memberships_delete on public.memberships for delete to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
-- O organizador pode remover conteúdo de sua comunidade; o autor pode remover o próprio.
grant delete on public.posts to authenticated;
create policy posts_delete on public.posts for delete to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
drop policy corre_photos_delete on storage.objects;
create policy corre_photos_delete on storage.objects for delete to authenticated using(bucket_id='run-photos' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.posts p join public.groups g on g.id=p.group_id where p.photo_path=storage.objects.name and g.owner_id=(select auth.uid()))));
drop policy corre_photos_insert on storage.objects;
create policy corre_photos_insert on storage.objects for insert to authenticated with check(bucket_id='run-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.profiles p where p.id=(select auth.uid())));
-- Registro pós-corrida exige que o período previsto tenha terminado.
drop policy posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.memberships m where m.group_id=posts.group_id and m.user_id=(select auth.uid()))
 and (run_id is null or exists(select 1 from public.participants p join public.runs r on r.id=p.run_id where p.run_id=posts.run_id and p.user_id=(select auth.uid()) and r.status='scheduled' and r.starts_at+make_interval(mins=>r.duration_minutes)<=now()))
 and (photo_path is null or (photo_path like ((select auth.uid())::text || '/%') and exists(select 1 from storage.objects o where o.bucket_id='run-photos' and o.name=photo_path)))
);

create table public.notifications(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 run_id uuid not null references public.runs(id) on delete cascade, title text not null, body text not null,
 created_at timestamptz not null default now(), read_at timestamptz
);
create index notifications_user_date_idx on public.notifications(user_id,created_at desc);
create index notifications_run_idx on public.notifications(run_id);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon,authenticated;
grant select,update(read_at) on public.notifications to authenticated;
create policy notifications_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- Trigger interno privilegiado apenas para entregar avisos aos participantes.
create function private.notify_run_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return new; end if;
 if row(old.title,old.starts_at,old.start_point,old.end_point,old.status,old.description,old.pace,old.distance,old.duration_minutes,old.neighborhood,old.beginner_friendly,old.no_one_left_behind,old.cancellation_reason) is distinct from row(new.title,new.starts_at,new.start_point,new.end_point,new.status,new.description,new.pace,new.distance,new.duration_minutes,new.neighborhood,new.beginner_friendly,new.no_one_left_behind,new.cancellation_reason) then
  insert into public.notifications(user_id,run_id,title,body)
  select p.user_id,new.id,case when new.status='cancelled' then 'Corrida cancelada' else 'Encontro atualizado' end,new.title||' — confira os detalhes atualizados antes de sair.' from public.participants p where p.run_id=new.id;
 end if; return new;
end; $$;
revoke all on function private.notify_run_change() from public,anon,authenticated;
create trigger run_changed after update on public.runs for each row execute function private.notify_run_change();

create table public.reports(
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade,
 group_id uuid not null references public.groups(id) on delete cascade, post_id uuid references public.posts(id) on delete set null,
 reason text not null check(length(trim(reason)) between 10 and 1000), status text not null default 'open' check(status in ('open','resolved')),
 created_at timestamptz not null default now()
);
create index reports_reporter_idx on public.reports(reporter_id);
create index reports_group_idx on public.reports(group_id);
create index reports_post_idx on public.reports(post_id);
alter table public.reports enable row level security;
revoke all on public.reports from anon,authenticated;
grant select,insert,update(status) on public.reports to authenticated;
create policy reports_read on public.reports for select to authenticated using(reporter_id=(select auth.uid()) or exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
create policy reports_insert on public.reports for insert to authenticated with check(reporter_id=(select auth.uid()) and status='open' and (post_id is null or exists(select 1 from public.posts p where p.id=post_id and p.group_id=reports.group_id)));
create policy reports_update on public.reports for update to authenticated using(exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid()))) with check(exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
