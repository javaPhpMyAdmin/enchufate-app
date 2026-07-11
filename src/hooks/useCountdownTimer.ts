/**
 * useCountdownTimer — live ticking countdown hook.
 *
 * Given a `busySince` timestamp (ISO 8601) and an `estimatedDurationMinutes`,
 * computes `estimatedEnd = busySince + duration` and ticks every second via
 * `setInterval`. Cleans up on unmount. Pauses when the app is backgrounded
 * (via AppState listener) and resumes on foreground to avoid wasted cycles.
 *
 * This is a **display-only** hook — it never writes to the DB.
 * TanStack Query's `refetchOnWindowFocus` reconciles any drift on foreground.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export interface CountdownResult {
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  /** "MM:SS" or "H:MM:SS" when hours > 0. "--:--" when no countdown. */
  display: string;
}

/**
 * @param busySince  ISO 8601 timestamp when the charger was set to busy, or null/undefined.
 * @param estimatedDurationMinutes  Chosen duration in minutes, or null/undefined.
 */
export function useCountdownTimer(
  busySince: string | null | undefined,
  estimatedDurationMinutes: number | null | undefined,
): CountdownResult {
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute estimated end once from the inputs.
  const estimatedEnd = (() => {
    if (!busySince || !estimatedDurationMinutes) return null;
    return new Date(
      new Date(busySince).getTime() + estimatedDurationMinutes * 60_000,
    );
  })();

  // Interval: tick every second when we have a valid end time.
  useEffect(() => {
    if (!estimatedEnd) return;

    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [estimatedEnd?.getTime()]);

  // AppState: pause interval when backgrounded, resume on foreground.
  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        setNow(Date.now()); // immediate sync on resume
        if (estimatedEnd && !intervalRef.current) {
          intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
        }
      } else {
        // Paused — clear interval to save cycles.
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [estimatedEnd?.getTime()]);

  // Derive result.
  if (!estimatedEnd) {
    return { minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true, display: '--:--' };
  }

  const totalSeconds = Math.max(
    0,
    Math.floor((estimatedEnd.getTime() - now) / 1000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  const display =
    hours > 0
      ? `${hours}:${pad(minutes % 60)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  return { minutes, seconds, totalSeconds, isExpired: totalSeconds === 0, display };
}
