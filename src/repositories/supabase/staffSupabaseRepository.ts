import { callSupabaseRpc, insertSupabaseRows, invokeSupabaseFunction, selectFromSupabase, updateSupabaseRows } from '../../lib/supabase/client';
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
  expiresAt?: string | null;
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
  expires_at?: string | null;
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
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null
  };
}

function assertRestaurant(restaurantId: RestaurantId): void {
  if (!restaurantId) throw new Error('Restaurante obrigatório para concluir esta ação.');
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

export async function removeStaffMember(restaurantId: RestaurantId, memberId: string): Promise<void> {
  assertRestaurant(restaurantId);
  await callSupabaseRpc<{ removed: boolean }>('remove_staff_member', {
    p_restaurant_id: restaurantId,
    p_member_id: memberId
  });
}

export async function findInvitationsForRestaurant(restaurantId: RestaurantId): Promise<StaffInvitation[]> {
  assertRestaurant(restaurantId);
  const rows = await selectFromSupabase<SupabaseInvitationRow>(
    'staff_invitations',
    'select=id,restaurant_id,email,role,status,created_at,expires_at&restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&order=created_at.desc'
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

export async function clearStaffInvitation(restaurantId: RestaurantId, invitationId: string): Promise<void> {
  assertRestaurant(restaurantId);
  await callSupabaseRpc<{ cleared: boolean }>('clear_staff_invitation', {
    p_restaurant_id: restaurantId,
    p_invitation_id: invitationId
  });
}

type InviteFunctionResponse = {
  invitation: {
    id: string;
    restaurantId: string;
    email: string;
    role: UserRole;
    status: 'pending' | 'accepted' | 'revoked';
    createdAt: string;
    expiresAt?: string | null;
  };
  emailSent: boolean;
  message: string;
  manualLink?: string | null;
};

export async function sendStaffInvitation(restaurantId: RestaurantId, email: string, role: UserRole): Promise<{ invitation: StaffInvitation; emailSent: boolean; message: string; manualLink?: string | null }> {
  assertRestaurant(restaurantId);
  if (role === 'owner') throw new Error('Convites não podem criar donos da conta.');
  const response = await invokeSupabaseFunction<InviteFunctionResponse>('staff-invite', {
    restaurantId,
    email: email.trim().toLowerCase(),
    role
  });
  return {
    invitation: response.invitation,
    emailSent: response.emailSent,
    message: response.message,
    manualLink: response.manualLink ?? null
  };
}

export type AcceptedInvitation = {
  restaurantId: RestaurantId;
  restaurantName: string;
  role: UserRole;
  status: 'accepted';
};

export async function acceptStaffInvitation(token: string): Promise<AcceptedInvitation> {
  let result: { restaurant_id: string; restaurant_name: string; role: UserRole; status: 'accepted' };
  try {
    result = await callSupabaseRpc<{ restaurant_id: string; restaurant_name: string; role: UserRole; status: 'accepted' }>('accept_staff_invitation', {
      p_token: token
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Convite não encontrado, expirado ou incompatível com este email')) {
      throw new Error('Este convite não pertence ao email logado, expirou ou já foi usado. Entre com o email convidado ou peça um novo convite.');
    }
    throw error;
  }
  return {
    restaurantId: result.restaurant_id,
    restaurantName: result.restaurant_name,
    role: result.role,
    status: result.status
  };
}
