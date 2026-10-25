-- Storage buckets + policies
insert into storage.buckets (id, name, public, file_size_limit)
values ('public-media', 'public-media', true, 20971520)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('private-files', 'private-files', false, 52428800)
on conflict (id) do nothing;

-- public-media: anyone can read, only admins write
create policy "public media read" on storage.objects for select
  using (bucket_id = 'public-media');
create policy "public media admin write" on storage.objects for all
  using (bucket_id = 'public-media' and public.is_admin())
  with check (bucket_id = 'public-media' and public.is_admin());

-- private-files: admins only (downloads via short-lived signed URLs from the API)
create policy "private files admin all" on storage.objects for all
  using (bucket_id = 'private-files' and public.is_admin())
  with check (bucket_id = 'private-files' and public.is_admin());
