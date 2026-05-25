import { getStoredAuthSession, refreshStoredAuthSession, signInWithPassword, signOutFromSupabase, SupabaseAuthSession } from '../lib/supabase/client';
import * as MemberRepository from '../repositories/supabase/memberSupabaseRepository';
import { RestaurantId, UserSession } from '../types';

export type AuthMembership = MemberRepository.RestaurantMember;

export function getStoredSession(): SupabaseAuthSession | null {
  return getStoredAuthSession();
}

export async function restoreSession(): Promise<SupabaseAuthSession | null> {
  return refreshStoredAuthSession();
}

export async function login(email: string, password: string): Promise<SupabaseAuthSession> {
  return signInWithPassword(email, password);
}

export async function logout(): Promise<void> {
  await signOutFromSupabase();
}

export async function getActiveMemberships(): Promise<AuthMembership[]> {
  return MemberRepository.findActiveMembershipsForCurrentUser();
}

export function getUserSessionFromMembership(session: SupabaseAuthSession, membership: AuthMembership, restaurantId: RestaurantId): UserSession {
  return {
    id: session.user.id,
    restaurantId,
    name: session.user.email.split('@')[0] || 'Usuário',
    role: membership.role,
    email: session.user.email
  };
}
