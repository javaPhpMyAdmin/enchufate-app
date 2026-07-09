/**
 * Auth-specific AsyncStorage helpers.
 *
 * Centralizes the keys used by the auth feature so the AuthProvider stays
 * focused on state management and so the on-disk format is easy to evolve
 * in one place.
 */
import { storage } from '@/lib/storage';

import type { UserSession } from './types';

/** Key used to persist the active user session (JSON-encoded). */
const SESSION_KEY = 'enchufate.session';

/** Key used to remember whether the user has finished the onboarding pager. */
const ONBOARDING_KEY = 'enchufate.onboardingSeen';

export async function saveSession(session: UserSession): Promise<void> {
  await storage.setJSON(SESSION_KEY, session);
}

export async function loadSession(): Promise<UserSession | null> {
  return storage.getJSON<UserSession>(SESSION_KEY);
}

export async function clearSession(): Promise<void> {
  await storage.remove(SESSION_KEY);
}

export async function setOnboardingSeen(): Promise<void> {
  await storage.setJSON(ONBOARDING_KEY, true);
}

export async function hasOnboardingBeenSeen(): Promise<boolean> {
  return (await storage.getJSON<boolean>(ONBOARDING_KEY)) === true;
}
