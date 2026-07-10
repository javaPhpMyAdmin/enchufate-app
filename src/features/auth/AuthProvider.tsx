/**
 * AuthProvider — React Context that owns the authenticated user session for
 * the lifetime of the app.
 *
 * Wire-up:
 *   - signIn  -> supabase.auth.signInWithPassword
 *   - signUp  -> supabase.auth.signUp (passes `display_name` / `surname`
 *                / `avatar_url` in `options.data` so the `handle_new_user`
 *                trigger creates the matching `profiles` row)
 *   - signInWithGoogle -> supabase.auth.signInWithOAuth + WebBrowser
 *   - signOut -> supabase.auth.signOut
 *
 * The session is owned by the Supabase JS client (which persists it to
 * AsyncStorage under the hood). We re-hydrate on mount via
 * `getSession()` and stay in sync via `onAuthStateChange()`. When the
 * session changes we SELECT the `profiles` row and map it to the `User`
 * shape the rest of the app consumes.
 *
 * The public `useAuth()` API stays compatible with prior consumers: the
 * only method relevant to Google is `signInWithGoogle`.
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
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

// ---------------------------------------------------------------------------
// CRITICAL: must run before any WebBrowser.openAuthSessionAsync call.
// On iOS, this dismisses the in-app browser if the app was launched via
// a universal link / OAuth callback while the auth session was in flight.
// Without it, the browser stays open after the redirect lands.
// ---------------------------------------------------------------------------
WebBrowser.maybeCompleteAuthSession();

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
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void applySession(supaSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
    // Linking.createURL already detects the environment:
    //   Expo Go:   exp://192.168.x.x:8081/--/auth/callback
    //   Dev build: enchufate://auth/callback
    // Both must be added to the Supabase redirect URI allow list.
    const redirectUrl = Linking.createURL('auth/callback');
    console.log('[auth] signInWithGoogle redirectUrl:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
    if (error) {
      throw new AuthError(error.message, { cause: error });
    }
    if (!data?.url) {
      throw new AuthError('Supabase did not return an auth URL');
    }

    console.log('[auth] opening webview with Supabase URL');
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
    );
    console.log('[auth] webview result type:', result.type);

    if (result.type === 'success' && result.url) {
      console.log('[auth] webview result.url:', result.url);
      // Try the PKCE flow first: Supabase returns a `?code=...` in the
      // redirect URL. exchangeCodeForSession exchanges that for tokens.
      const codeMatch = result.url.match(/[?&]code=([^&]+)/);
      if (codeMatch) {
        console.log('[auth] PKCE code found, exchanging…');
        try {
          await supabase.auth.exchangeCodeForSession(
            decodeURIComponent(codeMatch[1] ?? ''),
          );
          console.log('[auth] PKCE exchange OK');
        } catch (e) {
          console.warn('[auth] exchangeCodeForSession failed', e);
        }
      } else {
        console.log('[auth] no PKCE code in URL, trying implicit flow');
        // Fallback to the implicit flow: tokens live in the URL fragment
        // (`#access_token=...&refresh_token=...`). setSession accepts them
        // directly without a code exchange.
        const fragment = result.url.split('#')[1];
        if (fragment) {
          const params: Record<string, string> = {};
          fragment.split('&').forEach((pair) => {
            const [k, v] = pair.split('=');
            if (k && v) {
              params[k] = decodeURIComponent(v);
            }
          });
          if (params.access_token) {
            console.log('[auth] implicit access_token found, setting session');
            try {
              const { error: setError } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token ?? '',
              });
              if (setError) {
                console.warn('[auth] setSession failed', setError.message);
              } else {
                console.log('[auth] implicit session set OK');
              }
            } catch (e) {
              console.warn('[auth] setSession threw', e);
            }
          } else {
            console.log('[auth] no access_token in fragment');
          }
        } else {
          console.log('[auth] no fragment in URL');
        }
      }
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      console.log('[auth] user dismissed/cancelled the webview');
    } else {
      console.log('[auth] unexpected webview result:', JSON.stringify(result));
    }
    // The onAuthStateChange listener will fire SIGNED_IN if either
    // flow above succeeded.
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
