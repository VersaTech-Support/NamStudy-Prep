// ─── Notification Handlers ──────────────────────────────────────────────────
// Manages foreground notifications and response (tap) deep-linking.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { NotificationPayload, resolveNotificationRoute, NOTIFICATION_CHANNELS } from './types';

/**
 * Configure foreground notification behavior globally.
 */
export function configureNotificationHandler() {
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false, // Don't manipulate badges arbitrarily per requirement
    }),
  });
}

/**
 * Configure Android notification channels.
 */
export async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;

  for (const channel of NOTIFICATION_CHANNELS) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      description: channel.description,
      importance: channel.importance as Notifications.AndroidImportance,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
    });
  }
}

/**
 * Register global listener for notification responses (e.g. user taps).
 * Navigates to the correct app route using the strict routing logic.
 */
export function addNotificationResponseListener(): Notifications.Subscription | null {
  if (Platform.OS === 'web') return null;

  return Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response.notification.request.content.data;
      if (!data || !data.routeType) return;

      const payload = data as NotificationPayload;
      const route = resolveNotificationRoute(payload);
      
      if (__DEV__) console.log('[Notifications] Navigating to:', route);
      
      // Allow the router to process the deep link safely.
      // setTimeout ensures we don't interfere with navigation state transitions during app startup.
      setTimeout(() => {
        router.push(route as any);
      }, 500);

    } catch (err) {
      console.error('[Notifications] Response handling error:', err);
    }
  });
}
