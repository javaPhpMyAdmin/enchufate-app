/**
 * Auth feature — public types and errors.
 *
 * Kept dependency-free (no React, no RN) so the same types can be reused by
 * the Supabase adapter and by tests.
 *
 * `User` reuses the unified shape from `@/data/types` so the auth session
 * and the public profile render from the same record.
 */
import type { User } from '@/data/types';

export type { User };

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface UserSession {
  user: User;
  /** ISO 8601 timestamp of when the session was first persisted. */
  createdAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  surname: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  confirmPassword: string;
}

/**
 * Error thrown by the auth feature. Wraps the raw message from Supabase
 * (already in English) so callers can surface it inline in the form. Use
 * the helpers in `mapSupabaseError` to translate to Spanish before
 * presenting to the user.
 */
export class AuthError extends Error {
  public override readonly name: string = 'AuthError';
  public override readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}


/**
 * Maps a Supabase auth error message to a Spanish translation when a known
 * pattern matches. Returns the raw message otherwise so the user still sees
 * the original detail (Supabase messages are already user-friendly English).
 *
 * Keep the matching case-insensitive and substring-based — the wording from
 * Supabase can vary slightly across versions.
 */
export function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos';
  }
  if (lower.includes('user already registered')) {
    return 'Ya existe una cuenta con ese email';
  }
  if (lower.includes('password should be at least 6 characters')) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  if (lower.includes('email not confirmed')) {
    return 'Revisá tu casilla y confirmá tu email antes de iniciar sesión';
  }
  if (lower.includes('signup requires a valid password')) {
    return 'La contraseña no cumple los requisitos mínimos';
  }
  return message;
}
