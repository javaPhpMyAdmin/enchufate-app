/**
 * Push notification helpers — client-side token registration and local notifications.
 *
 * `registerPushToken` requests permission from the OS, obtains the Expo Push
 * Token, and upsets it into the `profiles` table so Edge Functions can
 * deliver server-side push notifications (new messages, new reviews).
 *
 * `clearPushToken` removes the token on sign-out so stale tokens don't
 * receive phantom notifications.
 *
 * The module is idempotent — calling `registerPushToken` multiple times is
 * safe and expected (token rotation on every sign-in).
 *
 * NOTE: expo-notifications is dynamically imported to avoid the
 * "Android Push notifications removed from Expo Go" error on SDK 53+.
 */
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Token lifecycle
// ---------------------------------------------------------------------------

/**
 * Request notification permissions, obtain the Expo Push Token, and
 * persist it to the `profiles.push_token` column.
 *
 * Safe to call on every sign-in — overwrites any previous token.
 * Returns the push token string, or null if the user denied permission.
 */
export async function registerPushToken(
  userId: string,
): Promise<string | null> {
  try {
    const Notifications = await import('expo-notifications');

    // 1. Request permission (no-op if already granted).
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[notifications] permission denied');
      return null;
    }

    // 2. Android needs a notification channel for heads-up display.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // 3. Get the Expo Push Token.
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    // 4. Persist to the profiles table.
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: pushToken })
      .eq('id', userId);

    if (error) {
      console.warn('[notifications] failed to save push token', error.message);
    }

    return pushToken;
  } catch (err) {
    console.warn('[notifications] registerPushToken error', err);
    return null;
  }
}

/**
 * Remove the push token from the profiles table on sign-out.
 * Prevents stale tokens from receiving notifications after the user
 * logs out or switches accounts.
 */
export async function clearPushToken(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: null })
      .eq('id', userId);

    if (error) {
      console.warn('[notifications] failed to clear push token', error.message);
    }
  } catch (err) {
    console.warn('[notifications] clearPushToken error', err);
  }
}

// ---------------------------------------------------------------------------
// Notification handler configuration
// ---------------------------------------------------------------------------

/**
 * Configure how incoming notifications are displayed while the app is
 * in the foreground. Background and killed-state handling is done by
 * Expo's native module automatically.
 */
export async function configureNotificationHandler(): Promise<void> {
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}
