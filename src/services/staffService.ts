import { RestaurantId, UserRole } from '../types';
import * as StaffRepository from '../repositories/supabase/staffSupabaseRepository';

export type StaffMember = StaffRepository.StaffMember;
export type StaffInvitation = StaffRepository.StaffInvitation;

const MANAGER_ASSIGNABLE_ROLES: UserRole[] = ['manager', 'kitchen', 'cashier', 'waiter'];
const OWNER_ASSIGNABLE_ROLES: UserRole[] = ['manager', 'kitchen', 'cashier', 'waiter'];

export function getAssignableRoles(actorRole: UserRole): UserRole[] {
  if (actorRole === 'owner') return OWNER_ASSIGNABLE_ROLES;
  if (actorRole === 'manager') return MANAGER_ASSIGNABLE_ROLES.filter(role => role !== 'manager');
  return [];
}

export function assertCanManageRole(actorRole: UserRole, targetRole: UserRole): void {
  if (!getAssignableRoles(actorRole).includes(targetRole)) {
    throw new Error('Seu perfil não pode atribuir esta permissão.');
  }
}

export async function loadStaff(restaurantId: RestaurantId): Promise<StaffMember[]> {
  return StaffRepository.findStaffForRestaurant(restaurantId);
}

export async function loadInvitations(restaurantId: RestaurantId): Promise<StaffInvitation[]> {
  return StaffRepository.findInvitationsForRestaurant(restaurantId);
}

export async function inviteStaff(restaurantId: RestaurantId, email: string, role: UserRole, actorRole: UserRole): Promise<StaffInvitation> {
  assertCanManageRole(actorRole, role);
  return StaffRepository.createStaffInvitation(restaurantId, email, role);
}

export async function updateStaffRole(restaurantId: RestaurantId, memberId: string, role: UserRole, actorRole: UserRole): Promise<StaffMember> {
  assertCanManageRole(actorRole, role);
  return StaffRepository.updateStaffMemberRole(restaurantId, memberId, role);
}

export async function setStaffActive(restaurantId: RestaurantId, memberId: string, active: boolean, actorRole: UserRole, targetRole: UserRole): Promise<StaffMember> {
  if (targetRole === 'owner') throw new Error('Owner não pode ser desativado por esta tela.');
  if (actorRole === 'manager' && targetRole === 'manager') throw new Error('Manager não pode alterar outro manager.');
  if (actorRole !== 'owner' && actorRole !== 'manager') throw new Error('Seu perfil não pode alterar funcionários.');
  return StaffRepository.setStaffMemberActive(restaurantId, memberId, active);
}

export async function revokeInvitation(restaurantId: RestaurantId, invitationId: string): Promise<StaffInvitation> {
  return StaffRepository.revokeStaffInvitation(restaurantId, invitationId);
}
