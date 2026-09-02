// ─── Notification Permissions ───────────────────────────────────────────────
// Handles permission requests for push notifications with platform awareness.
// Web and Expo Go on Android (SDK 53+) gracefully degrade.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/**
 * Check the current notification permission status.
 * Returns 'unsupported' on web or when the API is unavailable.
 */
export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'unsupported';

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionStatus;
  } catch {
    return 'unsupported';
  }
}

/**
 * Request notification permission from the OS.
 * Only call this after the user explicitly taps "Enable Notifications".
 * Never call this automatically on login.
 */
export async function requestPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'unsupported';

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return 'granted';

    const { status } = await Notifications.requestPermissionsAsync();
    return status as PermissionStatus;
  } catch {
    return 'unsupported';
  }
}

/**
 * Returns true if push notifications are available on this platform/runtime.
 * Remote push is unavailable in Expo Go on Android from SDK 53+.
 */
export function isPushAvailable(): boolean {
  return Platform.OS !== 'web';
}
