/**
 * Auth-specific AsyncStorage helpers.
 *
 * After Phase 4 the active session lives in Supabase's storage (managed
 * by the `@supabase/supabase-js` client). The session helpers below are
 * kept as no-op stubs only for backward compatibility with older import
 * sites that might still reference them — they no longer read or write
 * anything. They are marked `@deprecated` so consumers know to switch to
 * `useAuth()` / `supabase.auth` directly.
 *
 * Onboarding is still local app state and stays here: it's a per-device
 * UI flag with no remote meaning.
 */
import { storage } from '@/lib/storage';

import type { UserSession } from './types';

/** Key used to persist the active user session (JSON-encoded). */
const SESSION_KEY = 'enchufate.session';

/** Key used to remember whether the user has finished the onboarding pager. */
const ONBOARDING_KEY = 'enchufate.onboardingSeen';

/**
 * @deprecated The session is now managed by Supabase. Use
 * `supabase.auth.getSession()` / `supabase.auth.signOut()` instead.
 * Kept as a no-op so legacy callers do not crash.
 */
export async function saveSession(_session: UserSession): Promise<void> {
  // No-op: Supabase persists the session under its own key.
}

/**
 * @deprecated The session is now managed by Supabase. Use
 * `supabase.auth.getSession()` instead. This always returns `null`.
 */
export async function loadSession(): Promise<UserSession | null> {
  return null;
}

/**
 * @deprecated The session is now managed by Supabase. Use
 * `supabase.auth.signOut()` instead. Kept as a no-op.
 */
export async function clearSession(): Promise<void> {
  // No-op: Supabase clears the session under its own key.
}

export async function setOnboardingSeen(): Promise<void> {
  await storage.setJSON(ONBOARDING_KEY, true);
}

export async function hasOnboardingBeenSeen(): Promise<boolean> {
  return (await storage.getJSON<boolean>(ONBOARDING_KEY)) === true;
}
