/**
 * AuthProvider — React Context that owns the authenticated user session for
 * the lifetime of the app.
 *
 * Phase 4 swapped the AsyncStorage mock for real Supabase Auth:
 *   - signIn  -> supabase.auth.signInWithPassword
 *   - signUp  -> supabase.auth.signUp (passes `display_name` / `surname`
 *                / `avatar_url` in `options.data` so the `handle_new_user`
 *                trigger creates the matching `profiles` row)
 *   - signInWithGoogle -> supabase.auth.signInWithOAuth
 *   - signOut -> supabase.auth.signOut
 *
 * The session is owned by the Supabase JS client (which persists it to
 * AsyncStorage under the hood). We re-hydrate on mount via
 * `getSession()` and stay in sync via `onAuthStateChange()`. When the
 * session changes we SELECT the `profiles` row and map it to the `User`
 * shape the rest of the app consumes.
 *
 * The public `useAuth()` API stays compatible with prior consumers: the
 * only new method is `signInWithGoogle`.
 */
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import type { User } from '@/data/types';

import {
  hasOnboardingBeenSeen,
  setOnboardingSeen,
} from './authStorage';
import { fetchProfile, persistProfile } from './profileMapper';
import { loginSchema, registerSchema } from './schemas';
import {
  AuthError,
  type AuthCredentials,
  type AuthStatus,
  type SignUpData,
  type UserSession,
} from './types';

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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Mark the onboarding flow as completed and persist the flag. */
  completeOnboarding: () => Promise<void>;
  /**
   * Patch the current session's user with partial fields. Persists to the
   * `profiles` row in Supabase and updates local state. No-op if no
   * session is active.
   */
  updateProfile: (patch: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a session DTO from a Supabase session + the hydrated User. We
 * keep `createdAt` (used elsewhere in the app) sourced from the auth
 * user, not from the local clock, so it matches the server.
 */
function toUserSession(supaSession: Session, user: User): UserSession {
  return {
    user,
    createdAt: supaSession.user.created_at ?? new Date().toISOString(),
  };
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

  // Bootstrap: hydrate the session + profile + onboarding flag, then stay
  // in sync via the auth state change listener.
  useEffect(() => {
    let cancelled = false;

    const applySession = async (supaSession: Session | null): Promise<void> => {
      if (cancelled) return;
      if (!supaSession) {
        setSession(null);
        setStatus('unauthenticated');
        return;
      }
      try {
        const user = await fetchProfile(supaSession);
        if (cancelled) return;
        setSession(toUserSession(supaSession, user));
        setStatus('authenticated');
      } catch (err) {
        if (cancelled) return;
        console.warn('[auth] failed to hydrate profile', err);
        // Even if the profile fetch fails we mark as authenticated — the
        // session is valid, and the user can fix their profile from the
        // edit screen. Fall back to a synthesized user so the rest of
        // the app still has a value to render.
        setSession(
          toUserSession(supaSession, {
            id: supaSession.user.id,
            name:
              supaSession.user.user_metadata?.display_name ??
              supaSession.user.email?.split('@')[0] ??
              'Conductor',
            surname: supaSession.user.user_metadata?.surname ?? '',
            email: supaSession.user.email ?? '',
            avatarUrl:
              supaSession.user.user_metadata?.avatar_url ??
              'https://ui-avatars.com/api/?name=Conductor&background=00C896&color=fff&size=200&bold=true&format=png',
            rating: 0,
            reviewCount: 0,
            isOnline: true,
            isHost: false,
            joinedAt: supaSession.user.created_at ?? new Date().toISOString(),
          }),
        );
        setStatus('authenticated');
      }
    };

    (async () => {
      // 1. Read the persisted onboarding flag in parallel with the
      //    session lookup — both touch AsyncStorage on the native side.
      const seen = await hasOnboardingBeenSeen();
      if (cancelled) return;
      setOnboardingSeenState(seen);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) {
          console.warn('[auth] getSession error', error.message);
        }
        await applySession(data.session ?? null);
      } catch (err) {
        if (cancelled) return;
        console.warn('[auth] getSession threw', err);
        setSession(null);
        setStatus('unauthenticated');
      }
    })();

    // 2. Auth state changes. We deliberately use the sync callback form
    //    (no async return) to avoid the deadlock the supabase-js docs
    //    warn about when a `TOKEN_REFRESHED` handler triggers another
    //    refresh internally.
    const { data: sub } = supabase.auth.onAuthStateChange((event, supaSession) => {
      console.log('[auth-google] onAuthStateChange event:', event, 'hasSession:', !!supaSession);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void applySession(supaSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setStatus('unauthenticated');
      }
    });

    // 3. Deep-link listener for the OAuth callback. With
    //    `detectSessionInUrl: false` (see src/lib/supabase.ts) the JS
    //    client does not auto-parse the URL — we have to do it. The
    //    auth state change listener also fires when the session lands,
    //    so this is a safety net: if it never fires (e.g. a flaky
    //    subscription) we still complete the round-trip.
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      console.log('[auth-google] Linking url event:', url);
      void handleAuthCallback(url);
    });
    Linking.getInitialURL()
      .then((url) => {
        console.log('[auth-google] Linking.getInitialURL:', url);
        if (url) void handleAuthCallback(url);
      })
      .catch((err) => {
        console.warn('[auth-google] Linking.getInitialURL threw', err);
        // Linking.getInitialURL can reject if the native module is
        // unavailable; the listener above will catch warm-start URLs.
      });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Auth actions
  // -------------------------------------------------------------------------

  const signIn = useCallback(
    async (credentials: AuthCredentials): Promise<void> => {
      const parsed = loginSchema.parse(credentials);
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.password,
      });
      if (error) {
        throw new AuthError(error.message, { cause: error });
      }
      // The onAuthStateChange listener picks up the new session and
      // hydrates the profile; no manual setState needed here.
    },
    [],
  );

  const signUp = useCallback(async (data: SignUpData): Promise<void> => {
    const parsed = registerSchema.parse(data);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${parsed.name} ${parsed.surname}`,
    )}&background=00C896&color=fff&size=200&bold=true&format=png`;
    const { error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: {
          display_name: parsed.name,
          surname: parsed.surname,
          avatar_url: avatarUrl,
        },
      },
    });
    if (error) {
      throw new AuthError(error.message, { cause: error });
    }
    // Phone and city are not part of the auto-create trigger's payload;
    // the user can add them from the edit profile screen after sign-in.
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    console.log('[auth-google] 2a) AuthProvider.signInWithGoogle called');
    console.log('[auth-google] 2b) env URL:', process.env.EXPO_PUBLIC_SUPABASE_URL?.slice(0, 40) + '...');
    try {
      console.log('[auth-google] 2c) calling supabase.auth.signInWithOAuth({ google, enchufate://auth/callback })');
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'enchufate://auth/callback',
        },
      });
      console.log('[auth-google] 2d) signInWithOAuth resolved, result:', JSON.stringify({
        hasData: !!result.data,
        hasUrl: !!result.data?.url,
        urlStart: result.data?.url?.slice(0, 60),
        provider: result.data?.provider,
        error: result.error?.message,
      }));
      if (result.error) {
        throw new AuthError(result.error.message, { cause: result.error });
      }
    } catch (err) {
      console.error('[auth-google] 2e) signInWithOAuth threw:', err);
      throw err;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AuthError(error.message, { cause: error });
    }
    // The onAuthStateChange listener clears the React state.
  }, []);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    await setOnboardingSeen();
    setOnboardingSeenState(true);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<User>): Promise<void> => {
      // Compute the merged user outside of setState so we can both
      // update local state and fire the Supabase PATCH.
      let nextUser: User | null = null;
      setSession((current) => {
        if (!current) return current;
        nextUser = { ...current.user, ...patch };
        return { ...current, user: nextUser };
      });
      if (nextUser) {
        try {
          await persistProfile(nextUser);
        } catch (err) {
          // Surface the failure to the caller — the edit profile screen
          // shows a generic error and reverts via the session reload.
          throw err;
        }
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      onboardingSeen,
      signIn,
      signUp,
      signInWithGoogle,
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
      signInWithGoogle,
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

// ---------------------------------------------------------------------------
// OAuth callback handler
// ---------------------------------------------------------------------------

/**
 * Parse a `enchufate://auth/callback?...` URL and ask Supabase to
 * exchange the auth code for a session. Errors are logged but not
 * thrown — the auth state change listener is the source of truth for
 * the resulting `SIGNED_IN` event, and we'd rather not surface an
 * exception that's already been handled there.
 */
async function handleAuthCallback(url: string): Promise<void> {
  console.log('[auth-google] handleAuthCallback called with url:', url);
  if (!url.startsWith('enchufate://auth/callback')) {
    console.log('[auth-google] handleAuthCallback: not a callback URL, skipping');
    return;
  }
  try {
    console.log('[auth-google] calling supabase.auth.exchangeCodeForSession...');
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) {
      console.warn('[auth-google] exchangeCodeForSession failed', error.message);
    } else {
      console.log('[auth-google] exchangeCodeForSession succeeded');
    }
  } catch (err) {
    console.warn('[auth-google] exchangeCodeForSession threw', err);
  }
}
