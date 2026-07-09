/**
 * `useCanPublish` — v1 placeholder for the future subscription gate.
 *
 * Phase 7 will replace the body with a real entitlement check (active
 * subscription, trial window, admin override, etc.). The shape is locked
 * so the publish banner and any gating logic stay the same.
 */
import { useAuth } from '@/features/auth';

export interface CanPublishResult {
  canPublish: boolean;
  reason: 'beta' | 'subscription_active' | 'subscription_required' | 'unauthenticated';
}

export function useCanPublish(): CanPublishResult {
  const { status } = useAuth();
  if (status !== 'authenticated') {
    return { canPublish: false, reason: 'unauthenticated' };
  }
  // v1: every authenticated user can publish for free.
  return { canPublish: true, reason: 'beta' };
}
