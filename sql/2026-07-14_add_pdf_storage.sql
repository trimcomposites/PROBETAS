insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'pdfs',
  'pdfs',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pdfs_select_authenticated on storage.objects;
drop policy if exists pdfs_insert_role_based on storage.objects;
drop policy if exists pdfs_update_role_based on storage.objects;
drop policy if exists pdfs_delete_role_based on storage.objects;

create policy pdfs_select_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pdfs'
  and public.current_user_is_approved() = true
);

create policy pdfs_insert_role_based
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pdfs'
  and public.current_user_is_approved() = true
  and public.current_user_role() in ('creador', 'editor', 'gestor', 'admin')
);

create policy pdfs_update_role_based
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pdfs'
  and public.current_user_is_approved() = true
  and public.current_user_role() in ('editor', 'gestor', 'admin')
)
with check (
  bucket_id = 'pdfs'
  and public.current_user_is_approved() = true
  and public.current_user_role() in ('editor', 'gestor', 'admin')
);

create policy pdfs_delete_role_based
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pdfs'
  and public.current_user_is_approved() = true
  and public.current_user_role() in ('editor', 'gestor', 'admin')
);
