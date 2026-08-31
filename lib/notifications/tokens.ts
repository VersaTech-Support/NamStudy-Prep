// ─── Push Token Registration ────────────────────────────────────────────────
// Manages Expo push token acquisition and Supabase persistence.
// Idempotent: calling registerDevice() 10 times creates at most 1 row.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { requestPermission } from './permissions';

/**
 * Register the current device for push notifications.
 * 1. Requests permission (if not already granted)
 * 2. Acquires the Expo push token
 * 3. Upserts the token into push_tokens (idempotent via UNIQUE constraint)
 */
export async function registerDevice(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (__DEV__) console.log('[Notifications] Push tokens not supported on web');
    return null;
  }

  try {
    const status = await requestPermission();
    if (status !== 'granted') {
      if (__DEV__) console.log('[Notifications] Permission not granted:', status);
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    const expoPushToken = tokenData.data;

    if (__DEV__) console.log('[Notifications] Expo push token:', expoPushToken);

    // Upsert token into Supabase — idempotent via (user_id, expo_push_token) unique constraint
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          platform: Platform.OS,
          device_id: Constants.installationId || null,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,expo_push_token' }
      );

    if (error) {
      console.error('[Notifications] Token registration error:', error.message);
      return null;
    }

    if (__DEV__) console.log('[Notifications] Token registered successfully');
    return expoPushToken;
  } catch (err) {
    console.error('[Notifications] Token registration exception:', err);
    return null;
  }
}

/**
 * Deactivate a specific push token (e.g., on token rotation or logout).
 */
export async function deactivateToken(userId: string, token: string): Promise<void> {
  try {
    await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('expo_push_token', token);
  } catch (err) {
    console.error('[Notifications] Token deactivation error:', err);
  }
}

/**
 * Deactivate all tokens for a user (e.g., on logout).
 */
export async function deactivateAllTokens(userId: string): Promise<void> {
  try {
    await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch (err) {
    console.error('[Notifications] Token deactivation error:', err);
  }
}

/**
 * Listen for token changes and re-register if the token rotates.
 * Returns a subscription that should be cleaned up on unmount.
 */
export function listenForTokenChanges(userId: string): Notifications.Subscription {
  return Notifications.addPushTokenListener(async (newToken) => {
    if (__DEV__) console.log('[Notifications] Token changed:', newToken.data);
    await registerDevice(userId);
  });
}
