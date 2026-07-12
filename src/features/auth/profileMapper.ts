/**
 * profileMapper — translates between the `public.profiles` row in Supabase
 * and the unified `User` shape used by the rest of the app.
 *
 * The mapping lives here (and not in the AuthProvider) so it can be
 * imported by:
 *   - the AuthProvider (initial session + updateProfile)
 *   - the public profile screen, the charger detail sheet, etc. — anywhere
 *     we get a raw row back and want to render it.
 *
 * The `handle_new_user` trigger in
 * `supabase/migrations/20260710000000_fase_1_mvp.sql` creates the row on
 * signup from `raw_user_meta_data` (`display_name` + `avatar_url`). All
 * other fields default to safe values in the migration.
 */
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { User } from '@/data/types';

import { AuthError } from './types';

/**
 * Subset of the `public.profiles` row we read from Supabase. The actual
 * schema has more columns (see the migration) but these are the ones the
 * app consumes.
 *
 * `rating` is declared as `string | number` because Supabase's `numeric`
 * type ships as a string over the wire to preserve precision. The mapper
 * coerces to a number in one place so callers never have to think about it.
 */
export interface ProfileRow {
  id: string;
  display_name: string;
  surname: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  rating: number | string | null;
  review_count: number | null;
  is_host: boolean | null;
  is_online: boolean | null;
  joined_at: string | null;
  updated_at: string | null;
}

/**
 * UI-avatars.com URL for the given name. Used both as the seed value for
 * `avatar_url` at signup time and as the fallback when the row has none
 * (e.g. a Google sign-in user whose `raw_user_meta_data` lacks it).
 */
export function buildAvatarUrl(name: string, surname: string): string {
  const text = encodeURIComponent(`${name} ${surname}`.trim() || 'Conductor');
  return `https://ui-avatars.com/api/?name=${text}&background=00C896&color=fff&size=200&bold=true&format=png`;
}

/**
 * Map a `profiles` row + the session's email to the app's `User` shape.
 *
 * `email` is sourced from `auth.users` (the session), not the row, because
 * the profiles table intentionally does not store it.
 */
export function profileToUser(row: ProfileRow, email: string): User {
  const rating = row.rating == null ? 0 : Number(row.rating);
  const avatar =
    row.avatar_url ?? buildAvatarUrl(row.display_name, row.surname ?? '');
  return {
    id: row.id,
    name: row.display_name,
    surname: row.surname ?? '',
    email,
    avatarUrl: avatar,
    city: row.city ?? undefined,
    bio: row.bio ?? undefined,
    rating: Number.isFinite(rating) ? rating : 0,
    reviewCount: row.review_count ?? 0,
    isOnline: row.is_online ?? false,
    isHost: row.is_host ?? false,
    joinedAt: row.joined_at ?? new Date(0).toISOString(),
  };
}

/**
 * Synthesize a `User` from the session alone, when the `profiles` row is
 * missing (e.g. the trigger hasn't run yet, or RLS denied the SELECT).
 * Used as a last-resort fallback in `fetchProfile` so the app never gets
 * stuck on the splash.
 */
function synthesizeFromSession(supaSession: Session): User {
  const user = supaSession.user;
  const meta = (user.user_metadata ?? {}) as {
    display_name?: string;
    name?: string;
    surname?: string;
    avatar_url?: string;
    picture?: string;
  };
  const name = meta.name ?? meta.display_name ?? user.email?.split('@')[0] ?? 'Conductor';
  const surname = meta.surname ?? '';
  return {
    id: user.id,
    name,
    surname,
    email: user.email ?? '',
    avatarUrl: meta.avatar_url ?? meta.picture ?? buildAvatarUrl(name, surname),
    rating: 0,
    reviewCount: 0,
    isOnline: true,
    isHost: false,
    joinedAt: user.created_at ?? new Date().toISOString(),
  };
}

/**
 * Read the `profiles` row for the given session's user and map it to a
 * `User`. If the row is missing for any reason, logs a warning and falls
 * back to a synthesized user from the session metadata so the app stays
 * responsive.
 */
export async function fetchProfile(supaSession: Session): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', supaSession.user.id)
    .single();

  if (error || !data) {
    console.warn(
      '[auth] profiles row not found, synthesizing from session',
      error?.message,
    );
    return synthesizeFromSession(supaSession);
  }
  return profileToUser(data as ProfileRow, supaSession.user.email ?? '');
}

/**
 * Fetch a profile by user ID and map it to the app's `User` shape.
 * Used by the map, charger detail sheet, etc. to resolve real owner data.
 */
export async function fetchProfileById(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.warn('[profileMapper] fetchProfileById failed', error?.message);
    const fallbackName = userId.slice(0, 8);
    return {
      id: userId,
      name: fallbackName,
      surname: '',
      email: '',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=00C896&color=fff&size=200&bold=true&format=png`,
      rating: 0,
      reviewCount: 0,
      isOnline: false,
      isHost: true,
      joinedAt: new Date().toISOString(),
    };
  }
  return profileToUser(data as ProfileRow, '');
}

/**
 * Persist a partial update to the `profiles` row for the current user.
 * Translates the app's `User` shape to the `profiles` row shape (camelCase
 * → snake_case). Throws `AuthError` on failure so callers can surface a
 * single error type in the UI.
 */
export async function persistProfile(user: User): Promise<void> {
  const patch: Record<string, string | null> = {
    display_name: user.name,
    surname: user.surname,
    avatar_url: user.avatarUrl,
    city: user.city ?? null,
    bio: user.bio ?? null,
  };
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id);
  if (error) {
    throw new AuthError(error.message, { cause: error });
  }
}
