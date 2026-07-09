import type { User } from '@/data/types';

/**
 * Look up a user by id from a pre-loaded list. Components that need a user
 * (e.g. charger detail sheet) call this with the seed list.
 */
export function getUserById(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function getUserByIdOrThrow(users: User[], id: string): User {
  const u = getUserById(users, id);
  if (!u) {
    throw new Error(`User not found: ${id}`);
  }
  return u;
}
