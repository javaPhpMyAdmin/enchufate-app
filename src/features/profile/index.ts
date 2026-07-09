/**
 * Profile feature — public surface.
 *
 * Screens and components should import from this barrel so the internal
 * folder layout can evolve without breaking call sites.
 */
export {
  AVATAR_PRESETS,
  buildAvatarUrl,
  formatJoinedAt,
  formatRelativeTime,
  fullName,
  isCurrentUser,
} from './helpers';
export { editProfileSchema, type EditProfileInput } from './schemas';
