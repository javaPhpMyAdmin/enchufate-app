/**
 * Pure helpers for the profile feature.
 *
 * No React or React Native imports — safe to consume from any layer
 * (components, screens, tests).
 */
import type { User } from '@/data/types';

/**
 * Build a UI-Avatars URL for a given name + surname. The 8 preset avatars
 * used by the `AvatarPicker` call this with different name seeds so the
 * user can pick a visually distinct avatar even when their own name
 * looks like another option.
 *
 * Style matches `src/data/mocks/users.ts` so the avatars feel native
 * to the rest of the app.
 */
export function buildAvatarUrl(name: string, surname: string): string {
  const text = encodeURIComponent(`${name} ${surname}`.trim());
  return `https://ui-avatars.com/api/?name=${text}&background=00C896&color=fff&size=200&bold=true&format=png`;
}

/**
 * 8 preset name seeds for the avatar picker. Visually distinct first
 * letters so the user can tell them apart at a glance.
 */
export const AVATAR_PRESETS: ReadonlyArray<{ name: string; surname: string }> = [
  { name: 'Ana', surname: 'Pérez' },
  { name: 'Beto', surname: 'Gómez' },
  { name: 'Cami', surname: 'Díaz' },
  { name: 'Darío', surname: 'Soto' },
  { name: 'Eva', surname: 'Cruz' },
  { name: 'Fer', surname: 'Reyes' },
  { name: 'Gaby', surname: 'Núñez' },
  { name: 'Héctor', surname: 'Vidal' },
];

/**
 * "marzo 2024" — joined-at label rendered in the header.
 *
 * Spanish locale. Falls back to the raw ISO string if the date is
 * unparseable so the UI never crashes.
 */
export function formatJoinedAt(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Pretty "hace 2 semanas" — used by review cards. */
export function formatRelativeTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffW = Math.floor(diffD / 7);
    const diffM = Math.floor(diffD / 30);

    if (diffMin < 1) return 'recién';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffH < 24) return `hace ${diffH} h`;
    if (diffD === 1) return 'ayer';
    if (diffD < 7) return `hace ${diffD} días`;
    if (diffW === 1) return 'hace 1 semana';
    if (diffW < 4) return `hace ${diffW} semanas`;
    if (diffM === 1) return 'hace 1 mes';
    if (diffM < 12) return `hace ${diffM} meses`;
    const years = Math.floor(diffM / 12);
    return years === 1 ? 'hace 1 año' : `hace ${years} años`;
  } catch {
    return iso;
  }
}

/** True iff the given user is the currently authenticated one. */
export function isCurrentUser(
  user: Pick<User, 'id'> | null | undefined,
  currentUser: Pick<User, 'id'> | null | undefined,
): boolean {
  if (!user || !currentUser) return false;
  return user.id === currentUser.id;
}

/** Full name with a graceful fallback. */
export function fullName(user: Pick<User, 'name' | 'surname'>): string {
  return `${user.name} ${user.surname}`.trim() || 'Conductor';
}
