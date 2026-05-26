-- FluxMenu admin management extensions
-- Run after schema.sql, rls-policies.sql and onboarding-rpc.sql.

alter table public.restaurant_settings
  add column if not exists banner_url text,
  add column if not exists secondary_color text,
  add column if not exists opening_hours jsonb not null default '{}'::jsonb;

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email text not null,
  role text not null,
  status text not null default 'pending',
  invited_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_invitations_role_check check (role in ('manager', 'kitchen', 'cashier', 'waiter')),
  constraint staff_invitations_status_check check (status in ('pending', 'accepted', 'revoked')),
  constraint staff_invitations_unique_pending unique (restaurant_id, email, status)
);

create index if not exists idx_staff_invitations_restaurant on public.staff_invitations(restaurant_id, status, created_at desc);

alter table public.staff_invitations enable row level security;

grant select, insert, update on public.staff_invitations to authenticated;
grant update on public.restaurant_members to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists profiles_select_same_restaurant_manager on public.profiles;
drop policy if exists restaurant_members_update_owner_manager on public.restaurant_members;
drop policy if exists staff_invitations_select_manager on public.staff_invitations;
drop policy if exists staff_invitations_insert_manager on public.staff_invitations;
drop policy if exists staff_invitations_update_manager on public.staff_invitations;

create policy profiles_select_same_restaurant_manager
on public.profiles
for select
to authenticated
using (exists (
  select 1
  from public.restaurant_members viewer
  join public.restaurant_members target on target.restaurant_id = viewer.restaurant_id
  where viewer.profile_id = auth.uid()
    and viewer.active = true
    and viewer.role in ('owner', 'manager')
    and target.profile_id = profiles.id
));

create policy restaurant_members_update_owner_manager
on public.restaurant_members
for update
to authenticated
using (
  role <> 'owner'
  and (
    public.has_restaurant_role(restaurant_id, array['owner'])
    or (
      public.has_restaurant_role(restaurant_id, array['manager'])
      and role not in ('owner', 'manager')
    )
  )
)
with check (
  role <> 'owner'
  and (
    public.has_restaurant_role(restaurant_id, array['owner'])
    or (
      public.has_restaurant_role(restaurant_id, array['manager'])
      and role not in ('owner', 'manager')
    )
  )
);

create policy staff_invitations_select_manager
on public.staff_invitations
for select
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy staff_invitations_insert_manager
on public.staff_invitations
for insert
to authenticated
with check (
  public.has_restaurant_role(restaurant_id, array['owner', 'manager'])
  and role <> 'owner'
);

create policy staff_invitations_update_manager
on public.staff_invitations
for update
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
with check (
  public.has_restaurant_role(restaurant_id, array['owner', 'manager'])
  and role <> 'owner'
);

create or replace function public.set_staff_invitation_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.invited_by_profile_id = auth.uid();
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_invitations_actor_trigger on public.staff_invitations;
create trigger staff_invitations_actor_trigger
before insert or update on public.staff_invitations
for each row execute function public.set_staff_invitation_actor();

insert into storage.buckets (id, name, public)
values ('restaurant-assets', 'restaurant-assets', true)
on conflict (id) do update set public = true;

drop policy if exists restaurant_assets_select_public on storage.objects;
drop policy if exists restaurant_assets_insert_member on storage.objects;
drop policy if exists restaurant_assets_update_member on storage.objects;

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

notify pgrst, 'reload schema';
