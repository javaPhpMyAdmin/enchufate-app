/**
 * AuthProvider — React Context that owns the authenticated user session for
 * the lifetime of the app.
 *
 * Phase 1 ships a **mock** implementation:
 *   - signIn accepts any RFC-valid email + password >= 6 chars
 *   - signUp accepts any form that passes `registerSchema`
 *   - there is no remote backend; the session lives only in AsyncStorage
 *
 * Phase 4 added:
 *   - unified `User` shape (private + public fields)
 *   - `updateProfile(patch)` for the edit-profile screen
 *   - graceful hydration of older sessions persisted before the schema grew
 *
 * The public API (`useAuth`) is shaped so the real Supabase adapter can be
 * dropped in later without touching any screen.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  clearSession,
  hasOnboardingBeenSeen,
  loadSession,
  saveSession,
  setOnboardingSeen,
} from './authStorage';
import { loginSchema, registerSchema } from './schemas';
import type {
  AuthCredentials,
  AuthStatus,
  SignUpData,
  UserSession,
} from './types';
import type { User } from '@/data/types';
import { mockUsers } from '@/data/mocks/users';
import { getUserById } from '@/domain/user';

export interface AuthContextValue {
  status: AuthStatus;
  session: UserSession | null;
  /**
   * `null` until AsyncStorage hydration finishes; `true`/`false` afterwards.
   * The router uses this to decide between onboarding and welcome.
   */
  onboardingSeen: boolean | null;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  /** Mark the onboarding flow as completed and persist the flag. */
  completeOnboarding: () => Promise<void>;
  /**
   * Patch the current session's user with partial fields. Persists to
   * AsyncStorage and notifies subscribers. No-op if no session is active.
   */
  updateProfile: (patch: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Defaults / hydration helpers
// ---------------------------------------------------------------------------

/**
 * Merge a previously-persisted user record (possibly missing the new
 * fields introduced in Phase 4) with sensible defaults. If the user id
 * matches a seed user in `mocks/users.ts`, we hydrate the missing fields
 * from there so the public profile / charger cards stay consistent.
 */
function withUserDefaults(partial: Partial<User> & { id: string }): User {
  const seed = getUserById(mockUsers, partial.id);
  const fallback: User = {
    id: partial.id,
    name: '',
    surname: '',
    email: '',
    avatarUrl: '',
    rating: 0,
    reviewCount: 0,
    isOnline: true,
    isHost: false,
    joinedAt: new Date(0).toISOString(),
  };
  const merged: User = { ...fallback, ...seed, ...partial };
  // Last-resort avatar if we still don't have one.
  if (!merged.avatarUrl) {
    const name = `${merged.name} ${merged.surname}`.trim() || merged.id;
    merged.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name,
    )}&background=00C896&color=fff&size=200&bold=true&format=png`;
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Mock helpers — used by `signIn` to derive a name when the user only
// provides an email. Replace with real backend responses later.
// ---------------------------------------------------------------------------

function generateId(): string {
  // Time-based id with a random suffix; good enough for a mock layer.
  return `u_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function capitalize(value: string): string {
  if (value.length === 0) return value;
  return (value[0] ?? '').toUpperCase() + value.slice(1).toLowerCase();
}

function deriveNameFromEmail(email: string): { name: string; surname: string } {
  const local = email.split('@')[0] ?? 'Conductor';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return { name: capitalize(parts[0] ?? ''), surname: capitalize(parts[1] ?? '') };
  }
  return { name: capitalize(local), surname: 'Enchufate' };
}

function buildAvatarUrl(name: string, email: string): string {
  const text = encodeURIComponent(name || email);
  // Matches the style used in src/data/mocks/users.ts so the UI feels
  // consistent whether the user is a host or the signed-in driver.
  return `https://ui-avatars.com/api/?name=${text}&background=00C896&color=fff&size=200&bold=true&format=png`;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<UserSession | null>(null);
  const [onboardingSeen, setOnboardingSeenState] = useState<boolean | null>(
    null,
  );

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedSession, seen] = await Promise.all([
        loadSession(),
        hasOnboardingBeenSeen(),
      ]);
      if (cancelled) return;
      if (storedSession) {
        // Backward compat: a session persisted before Phase 4 may be missing
        // the new unified fields. Re-apply defaults + seed-merge so the rest
        // of the app can treat the user as a complete `User`. We then
        // persist the merged shape so the next cold-start is clean.
        const hydrated: UserSession = {
          ...storedSession,
          user: withUserDefaults(
            storedSession.user as Partial<User> & { id: string },
          ),
        };
        setSession(hydrated);
        await saveSession(hydrated);
        setStatus('authenticated');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
      if (!cancelled) {
        setOnboardingSeenState(seen);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (credentials: AuthCredentials): Promise<void> => {
      const parsed = loginSchema.parse(credentials);
      const { name, surname } = deriveNameFromEmail(parsed.email);
      const user: User = {
        id: generateId(),
        name,
        surname,
        email: parsed.email,
        avatarUrl: buildAvatarUrl(`${name} ${surname}`, parsed.email),
        rating: 0,
        reviewCount: 0,
        isOnline: true,
        isHost: false,
        joinedAt: new Date().toISOString(),
      };
      const next: UserSession = { user, createdAt: new Date().toISOString() };
      await saveSession(next);
      setSession(next);
      setStatus('authenticated');
    },
    [],
  );

  const signUp = useCallback(async (data: SignUpData): Promise<void> => {
    const parsed = registerSchema.parse(data);
    const user: User = {
      id: generateId(),
      name: parsed.name,
      surname: parsed.surname,
      email: parsed.email,
      phone: parsed.phone,
      city: parsed.city,
      avatarUrl: buildAvatarUrl(
        `${parsed.name} ${parsed.surname}`,
        parsed.email,
      ),
      rating: 0,
      reviewCount: 0,
      isOnline: true,
      isHost: false,
      joinedAt: new Date().toISOString(),
    };
    const next: UserSession = { user, createdAt: new Date().toISOString() };
    await saveSession(next);
    setSession(next);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await clearSession();
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    await setOnboardingSeen();
    setOnboardingSeenState(true);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<User>): Promise<void> => {
      setSession((current) => {
        if (!current) return current;
        const nextUser: User = { ...current.user, ...patch };
        const nextSession: UserSession = { ...current, user: nextUser };
        // Fire-and-forget persistence — the in-memory state is already
        // updated and the caller's await isn't blocked on the disk write.
        void saveSession(nextSession);
        return nextSession;
      });
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      onboardingSeen,
      signIn,
      signUp,
      signOut,
      completeOnboarding,
      updateProfile,
    }),
    [
      status,
      session,
      onboardingSeen,
      signIn,
      signUp,
      signOut,
      completeOnboarding,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
