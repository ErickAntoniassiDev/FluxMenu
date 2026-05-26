-- FluxMenu product image storage
-- Run after schema.sql, rls-policies.sql and multi-tenant-security.sql.

begin;

alter table public.products
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists product_images_select_public on storage.objects;
drop policy if exists product_images_insert_manager on storage.objects;
drop policy if exists product_images_update_manager on storage.objects;
drop policy if exists product_images_delete_manager on storage.objects;

create policy product_images_select_public
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy product_images_insert_manager
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
);

create policy product_images_update_manager
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
)
with check (
  bucket_id = 'product-images'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
);

create policy product_images_delete_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
);

commit;
notify pgrst, 'reload schema';
