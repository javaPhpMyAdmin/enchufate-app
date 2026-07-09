/**
 * Auth feature — public types.
 *
 * Kept dependency-free (no React, no RN) so the same types can be reused by
 * the future Supabase adapter and by tests.
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
