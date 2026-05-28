import { consumeAuthSessionFromUrl, getStoredAuthSession, refreshStoredAuthSession, signInWithPassword, signOutFromSupabase, signUpWithPassword, resendSignupConfirmation, SupabaseAuthSession } from '../lib/supabase/client';
import * as MemberRepository from '../repositories/supabase/memberSupabaseRepository';
import * as OnboardingRepository from '../repositories/supabase/onboardingSupabaseRepository';
import { RestaurantId, RestaurantOnboardingSetup, UserSession } from '../types';

export type AuthMembership = MemberRepository.RestaurantMember;

export interface RegisterRestaurantInput {
  email: string;
  password: string;
  restaurantName: string;
}

export interface RegisterRestaurantResult {
  session: SupabaseAuthSession;
  onboarding: OnboardingRepository.OnboardingResult | null;
}

export interface PendingOnboarding {
  email: string;
  restaurantName: string;
}

const pendingOnboardingKey = 'flux_pending_onboarding';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getStoredSession(): SupabaseAuthSession | null {
  return getStoredAuthSession();
}

export async function restoreSession(): Promise<SupabaseAuthSession | null> {
  const urlSession = await consumeAuthSessionFromUrl();
  return urlSession ?? refreshStoredAuthSession();
}

export function getPendingOnboarding(email?: string): PendingOnboarding | null {
  const raw = localStorage.getItem(pendingOnboardingKey);
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw) as PendingOnboarding;
    if (email && normalizeEmail(pending.email) !== normalizeEmail(email)) return null;
    return pending;
  } catch {
    localStorage.removeItem(pendingOnboardingKey);
    return null;
  }
}

export function savePendingOnboarding(input: PendingOnboarding): void {
  localStorage.setItem(pendingOnboardingKey, JSON.stringify({
    email: normalizeEmail(input.email),
    restaurantName: input.restaurantName.trim()
  }));
}

export function clearPendingOnboarding(): void {
  localStorage.removeItem(pendingOnboardingKey);
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  await resendSignupConfirmation(normalizeEmail(email));
}

export async function registerStaffAccount(email: string, password: string): Promise<SupabaseAuthSession> {
  const session = await signUpWithPassword(normalizeEmail(email), password);
  if (!session) {
    throw new Error('Conta criada. Confirme o email e depois entre novamente para aceitar o convite.');
  }
  return session;
}

export async function registerRestaurant(input: RegisterRestaurantInput): Promise<RegisterRestaurantResult> {
  const email = normalizeEmail(input.email);
  const restaurantName = input.restaurantName.trim();
  savePendingOnboarding({ email, restaurantName });
  const session = await signUpWithPassword(email, input.password);

  if (!session) {
    throw new Error('Conta criada. Confirme o email e depois entre para concluir o cadastro do restaurante.');
  }

  return { session, onboarding: null };
}

export async function completePendingOnboarding(_session: SupabaseAuthSession, setup?: RestaurantOnboardingSetup): Promise<OnboardingRepository.OnboardingResult | null> {
  if (!setup) return null;
  const onboarding = await OnboardingRepository.createRestaurantOnboarding(setup.restaurantName, setup.planId, setup);
  clearPendingOnboarding();
  return onboarding;
}

export async function login(email: string, password: string): Promise<SupabaseAuthSession> {
  return signInWithPassword(normalizeEmail(email), password);
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

export async function createRestaurantOnboarding(setup: RestaurantOnboardingSetup): Promise<OnboardingRepository.OnboardingResult> {
  const onboarding = await OnboardingRepository.createRestaurantOnboarding(setup.restaurantName, setup.planId, setup);
  clearPendingOnboarding();
  return onboarding;
}
