-- FluxMenu restaurant settings production hardening
-- Run after schema.sql, admin-management.sql, multi-tenant-security.sql and feature-gating.sql.

begin;

alter table public.restaurant_settings
  add column if not exists banner_url text,
  add column if not exists secondary_color text,
  add column if not exists opening_hours jsonb not null default '{}'::jsonb;

update public.restaurant_settings
set opening_hours = '{}'::jsonb
where opening_hours is null;

alter table public.restaurant_settings
  alter column opening_hours set default '{}'::jsonb,
  alter column opening_hours set not null;

-- Store identity/contact/visual settings are core restaurant data for production.
-- Plan feature gates remain active for catalog/team/order limits, but this screen
-- must be editable by owner/manager for every tenant.
drop trigger if exists restaurant_settings_feature_gate_trigger on public.restaurant_settings;

insert into storage.buckets (id, name, public)
values ('restaurant-assets', 'restaurant-assets', true)
on conflict (id) do update set public = true;

drop policy if exists restaurant_assets_select_public on storage.objects;
drop policy if exists restaurant_assets_insert_member on storage.objects;
drop policy if exists restaurant_assets_update_member on storage.objects;
drop policy if exists restaurant_assets_delete_member on storage.objects;

create policy restaurant_assets_select_public
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'restaurant-assets');

create policy restaurant_assets_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
);

create policy restaurant_assets_update_member
on storage.objects
for update
to authenticated
using (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
)
with check (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
);

create policy restaurant_assets_delete_member
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
);

commit;
notify pgrst, 'reload schema';
