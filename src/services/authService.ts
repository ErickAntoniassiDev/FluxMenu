import { getStoredAuthSession, refreshStoredAuthSession, signInWithPassword, signOutFromSupabase, signUpWithPassword, SupabaseAuthSession } from '../lib/supabase/client';
import * as MemberRepository from '../repositories/supabase/memberSupabaseRepository';
import * as OnboardingRepository from '../repositories/supabase/onboardingSupabaseRepository';
import { RestaurantId, UserSession } from '../types';

export type AuthMembership = MemberRepository.RestaurantMember;

export interface RegisterRestaurantInput {
  email: string;
  password: string;
  restaurantName: string;
}

export interface RegisterRestaurantResult {
  session: SupabaseAuthSession;
  onboarding: OnboardingRepository.OnboardingResult;
}


export function getStoredSession(): SupabaseAuthSession | null {
  return getStoredAuthSession();
}

export async function restoreSession(): Promise<SupabaseAuthSession | null> {
  return refreshStoredAuthSession();
}


export async function registerRestaurant(input: RegisterRestaurantInput): Promise<RegisterRestaurantResult> {
  const session = await signUpWithPassword(input.email, input.password);
  const onboarding = await OnboardingRepository.createRestaurantOnboarding(input.restaurantName, 'starter');
  return { session, onboarding };
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
