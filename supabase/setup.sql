create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.comunidad enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.app_role
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Profiles are visible to their owner and admins"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Authenticated users can read communities"
  on public.comunidad
  for select
  to authenticated
  using (true);

create policy "Admins can insert communities"
  on public.comunidad
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update communities"
  on public.comunidad
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete communities"
  on public.comunidad
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on public.comunidad to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1), '')
from auth.users
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.comunidad;
exception
  when duplicate_object then null;
end;
$$;
-- Acceso individual por comunidad
alter table public.comunidad add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists community_id bigint references public.comunidad(id) on delete set null;

create index if not exists comunidad_user_id_idx on public.comunidad(user_id);
create index if not exists profiles_community_id_idx on public.profiles(community_id);

-- El usuario estándar solo puede leer su propia comunidad.
drop policy if exists "Authenticated users can read communities" on public.comunidad;
create policy "Users read only their community" on public.comunidad
  for select to authenticated
  using (
    (select public.is_admin())
    or user_id = (select auth.uid())
    or id = (select community_id from public.profiles where id = (select auth.uid()))
  );

-- Los perfiles pueden ser vistos por su propietario y administradores.
drop policy if exists "Profiles are visible to their owner and admins" on public.profiles;
create policy "Profiles are visible to their owner and admins" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Impide que un usuario normal pueda cambiar su comunidad o rol.
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Sincroniza perfiles creados por Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
