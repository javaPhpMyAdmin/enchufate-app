/**
 * Auth feature — public surface.
 *
 * Screens and components should import from this barrel so the internal
 * folder layout can evolve without breaking call sites.
 */
export {
  AuthProvider,
  useAuth,
  type AuthContextValue,
  type AuthProviderProps,
} from './AuthProvider';

export {
  clearSession,
  hasOnboardingBeenSeen,
  loadSession,
  saveSession,
  setOnboardingSeen,
} from './authStorage';

export { loginSchema, registerSchema } from './schemas';
export type { LoginInput, RegisterInput } from './schemas';

export type {
  AuthCredentials,
  AuthStatus,
  SignUpData,
  UserSession,
} from './types';
// `User` is re-exported from auth/types for convenience, but it actually
// lives in `@/data/types` — re-exported from there too so the rest of the
// app can import the same identifier from any of the two feature barrels.
export type { User } from './types';
