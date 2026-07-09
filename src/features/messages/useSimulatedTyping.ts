/**
 * `useSimulatedTyping` — fake "the other user is typing..." indicator.
 *
 * Phase 5 ships a **mock** implementation: there's no real-time backend
 * to subscribe to, so we synthesize the indicator locally. The chat
 * screen calls `startTyping()` after the current user sends a message;
 * 1.5s later the indicator turns on, and 3s after that it turns off.
 *
 * In Phase 6 we'll swap this for a Supabase Realtime presence channel
 * that subscribes to a "typing" event broadcast by the other client.
 * The hook's public surface is intentionally small so the swap is
 * a one-file change.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const TYPING_START_DELAY_MS = 1500;
const TYPING_DURATION_MS = 3000;

export interface SimulatedTyping {
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useSimulatedTyping(): SimulatedTyping {
  const [isTyping, setIsTyping] = useState<boolean>(false);
  // We keep the timer handles in a ref so a rapid `startTyping` (e.g.
  // user sends two messages back-to-back) cancels the previous run
  // and starts fresh. Otherwise the indicator would flicker.
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback((): void => {
    if (startTimerRef.current != null) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (stopTimerRef.current != null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const stopTyping = useCallback((): void => {
    clearTimers();
    setIsTyping(false);
  }, [clearTimers]);

  const startTyping = useCallback((): void => {
    clearTimers();
    startTimerRef.current = setTimeout(() => {
      setIsTyping(true);
      stopTimerRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTimerRef.current = null;
      }, TYPING_DURATION_MS);
      startTimerRef.current = null;
    }, TYPING_START_DELAY_MS);
  }, [clearTimers]);

  // Tear down on unmount so a closed chat doesn't leave a dangling
  // timer trying to call setState on an unmounted component.
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return { isTyping, startTyping, stopTyping };
}
