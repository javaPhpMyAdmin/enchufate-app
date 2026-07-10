/**
 * googleAuth — Google OAuth helpers for the Supabase auth flow.
 *
 * The Supabase JS client opens the provider's consent screen in a webview
 * (via `signInWithOAuth`) and redirects back to the app through the
 * `enchufate://auth/callback` deep link. The auth state change listener
 * in `AuthProvider` picks up the new session when the URL is processed —
 * no manual `exchangeCodeForSession` call is needed in the happy path.
 *
 * Setup required before this works:
 *   1. Enable the Google provider in Supabase:
 *        Dashboard > Authentication > Providers > Google
 *      with the OAuth client ID + secret from Google Cloud Console.
 *   2. Add `enchufate://auth/callback` to the URL Configuration's
 *      "Additional redirect URLs" allow-list.
 *   3. The native deep link is already wired in `app.json` via
 *      `"scheme": "enchufate"` — Expo routes the URL back into the JS
 *      bundle automatically.
 */
import { supabase } from '@/lib/supabase';

import { AuthError } from './types';

export const GOOGLE_OAUTH_REDIRECT = 'enchufate://auth/callback';

/**
 * Start the Google OAuth flow. On success the webview opens and the
 * provider redirects back to the app via the deep link above. The auth
 * state change listener fires with `SIGNED_IN` when the session lands.
 *
 * Throws `AuthError` if Supabase rejects the request (e.g. the provider
 * is not configured in the dashboard).
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: GOOGLE_OAUTH_REDIRECT,
    },
  });
  if (error) {
    throw new AuthError(error.message, { cause: error });
  }
}
