import type { Charger, User } from '../types';

import { mockChargers } from './chargers';
import { mockUsers } from './users';

/**
 * Aggregator for the mock dataset. Components import from here so we can
 * later swap the implementation for a real Supabase-backed loader without
 * touching call sites.
 */
export interface MockSeed {
  chargers: Charger[];
  users: User[];
}

export const seed: MockSeed = {
  chargers: mockChargers,
  users: mockUsers,
};
