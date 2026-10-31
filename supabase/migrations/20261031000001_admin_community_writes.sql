-- Keep community writes available only to administrators, even when replacing
-- policies from an earlier deployment.
begin;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comunidad'
  loop
    execute format('drop policy %I on public.comunidad', existing_policy.policyname);
  end loop;
end;
$$;

create policy "Admins can read all communities"
  on public.comunidad
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "Users can read their own community"
  on public.comunidad
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'user'::public.app_role
        and p.community_id = comunidad.id
    )
  );

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

grant select, insert, update, delete on table public.comunidad to authenticated;

do $$
declare
  comunidad_id_sequence text;
begin
  comunidad_id_sequence := pg_get_serial_sequence('public.comunidad', 'id');
  if comunidad_id_sequence is not null then
    execute format(
      'grant usage, select on sequence %s to authenticated',
      comunidad_id_sequence
    );
  end if;
end;
$$;

commit;
