/**
 * Supabase client — single shared instance for the whole app.
 *
 * Reads credentials from EXPO_PUBLIC_* env vars (defined in `.env`,
 * gitignored). The `EXPO_PUBLIC_` prefix is required for Expo to
 * inline the value at build time and expose it to the JS bundle.
 *
 * The anon key is safe to ship in the client (it's JWT-signed and
 * RLS policies enforce what each user can do). The `service_role`
 * key is NEVER used here — that bypasses RLS and belongs only on
 * the server.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Make sure .env has ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your project values.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in the device's secure storage (AsyncStorage
    // under the hood). Required for the user to stay logged in across
    // app restarts.
    persistSession: true,
    // Refresh the JWT automatically before it expires.
    autoRefreshToken: true,
    // Expo Go doesn't use URL-based session detection (that's a web
    // thing). Sessions are picked up via the auth state listener.
    detectSessionInUrl: false,
  },
});
