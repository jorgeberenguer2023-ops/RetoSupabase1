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
