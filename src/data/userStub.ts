/**
 * Shared stub for unknown users.
 *
 * When a user ID isn't in the local mock list (e.g. freshly-created
 * conversation, charger created via host flow), we generate a stable
 * placeholder using ui-avatars. The cache prevents re-creation on
 * every render.
 */
import type { User } from './types';

const stubCache: Record<string, User> = {};

export function genericUser(id: string): User {
  const cached = stubCache[id];
  if (cached) return cached;

  const shortId = id.slice(0, 8);
  const u: User = {
    id,
    name: 'Conductor',
    surname: '',
    email: '',
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      shortId,
    )}&background=00C896&color=fff&size=200&bold=true&format=png`,
    rating: 0,
    reviewCount: 0,
    isOnline: false,
    isHost: false,
    joinedAt: new Date().toISOString(),
  };
  stubCache[id] = u;
  return u;
}
