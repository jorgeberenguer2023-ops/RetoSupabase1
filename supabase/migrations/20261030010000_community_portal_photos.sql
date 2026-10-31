-- Fotografías de los portales de cada comunidad.
-- Los archivos se guardan en Storage; en public.comunidad solo se guarda la ruta.
alter table public.comunidad
  add column if not exists portal_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-photos',
  'community-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- El bucket es privado. Los administradores pueden leer todas las fotos y
-- cada usuario solo puede generar enlaces firmados para la foto de su comunidad.
drop policy if exists "Community users read their portal photo" on storage.objects;
create policy "Community users read their portal photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-photos'
    and (
      (select public.is_admin())
      or exists (
        select 1
        from public.comunidad c
        left join public.profiles p on p.id = (select auth.uid())
        where c.id::text = (storage.foldername(name))[1]
          and (c.user_id = (select auth.uid()) or p.community_id = c.id)
      )
    )
  );

drop policy if exists "Admins upload community portal photos" on storage.objects;
create policy "Admins upload community portal photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'community-photos' and (select public.is_admin()));

drop policy if exists "Admins update community portal photos" on storage.objects;
create policy "Admins update community portal photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'community-photos' and (select public.is_admin()))
  with check (bucket_id = 'community-photos' and (select public.is_admin()));

drop policy if exists "Admins delete community portal photos" on storage.objects;
create policy "Admins delete community portal photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'community-photos' and (select public.is_admin()));
