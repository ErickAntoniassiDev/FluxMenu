import { insertSupabaseRows, selectFromSupabase, updateSupabaseRows } from '../../lib/supabase/client';
import { RestaurantId, UserRole } from '../../types';

export type StaffMember = {
  id: string;
  restaurantId: RestaurantId;
  profileId: string;
  role: UserRole;
  active: boolean;
  name: string;
  email: string;
};

export type StaffInvitation = {
  id: string;
  restaurantId: RestaurantId;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
};

type SupabaseStaffMemberRow = {
  id: string;
  restaurant_id: string;
  profile_id: string;
  role: UserRole;
  active: boolean;
  profile?: { name?: string | null; email?: string | null } | null;
};

type SupabaseInvitationRow = {
  id: string;
  restaurant_id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
};

function toStaffMember(row: SupabaseStaffMemberRow): StaffMember {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    profileId: row.profile_id,
    role: row.role,
    active: row.active,
    name: row.profile?.name ?? row.profile?.email?.split('@')[0] ?? 'Usuário',
    email: row.profile?.email ?? ''
  };
}

function toInvitation(row: SupabaseInvitationRow): StaffInvitation {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at
  };
}

function assertRestaurant(restaurantId: RestaurantId): void {
  if (!restaurantId) throw new Error('restaurant_id obrigatório.');
}

export async function findStaffForRestaurant(restaurantId: RestaurantId): Promise<StaffMember[]> {
  assertRestaurant(restaurantId);
  const rows = await selectFromSupabase<SupabaseStaffMemberRow>(
    'restaurant_members',
    'select=id,restaurant_id,profile_id,role,active,profile:profiles(name,email)&restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&order=created_at.asc'
  );
  return rows.map(toStaffMember);
}

export async function updateStaffMemberRole(restaurantId: RestaurantId, memberId: string, role: UserRole): Promise<StaffMember> {
  assertRestaurant(restaurantId);
  if (role === 'owner') throw new Error('Managers não podem promover usuários para owner.');
  const rows = await updateSupabaseRows<SupabaseStaffMemberRow>(
    'restaurant_members',
    'id=eq.' + encodeURIComponent(memberId) + '&restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&select=id,restaurant_id,profile_id,role,active,profile:profiles(name,email)',
    { role }
  );
  if (!rows[0]) throw new Error('Funcionário não encontrado ou sem permissão.');
  return toStaffMember(rows[0]);
}

export async function setStaffMemberActive(restaurantId: RestaurantId, memberId: string, active: boolean): Promise<StaffMember> {
  assertRestaurant(restaurantId);
  const rows = await updateSupabaseRows<SupabaseStaffMemberRow>(
    'restaurant_members',
    'id=eq.' + encodeURIComponent(memberId) + '&restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&select=id,restaurant_id,profile_id,role,active,profile:profiles(name,email)',
    { active }
  );
  if (!rows[0]) throw new Error('Funcionário não encontrado ou sem permissão.');
  return toStaffMember(rows[0]);
}

export async function findInvitationsForRestaurant(restaurantId: RestaurantId): Promise<StaffInvitation[]> {
  assertRestaurant(restaurantId);
  const rows = await selectFromSupabase<SupabaseInvitationRow>(
    'staff_invitations',
    'select=id,restaurant_id,email,role,status,created_at&restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&order=created_at.desc'
  );
  return rows.map(toInvitation);
}

export async function createStaffInvitation(restaurantId: RestaurantId, email: string, role: UserRole): Promise<StaffInvitation> {
  assertRestaurant(restaurantId);
  if (role === 'owner') throw new Error('Convites não podem criar owners.');
  const rows = await insertSupabaseRows<SupabaseInvitationRow>('staff_invitations', {
    restaurant_id: restaurantId,
    email: email.trim().toLowerCase(),
    role,
    status: 'pending'
  });
  if (!rows[0]) throw new Error('Não foi possível criar o convite.');
  return toInvitation(rows[0]);
}

export async function revokeStaffInvitation(restaurantId: RestaurantId, invitationId: string): Promise<StaffInvitation> {
  assertRestaurant(restaurantId);
  const rows = await updateSupabaseRows<SupabaseInvitationRow>(
    'staff_invitations',
    'id=eq.' + encodeURIComponent(invitationId) + '&restaurant_id=eq.' + encodeURIComponent(restaurantId),
    { status: 'revoked' }
  );
  if (!rows[0]) throw new Error('Convite não encontrado ou sem permissão.');
  return toInvitation(rows[0]);
}
