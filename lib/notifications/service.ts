// ─── Notification Service ───────────────────────────────────────────────────
// Central public facade for the application UI to interact with notifications.
// Prevents screens from importing low-level expo-notifications directly.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { configureNotificationHandler, setupAndroidChannels, addNotificationResponseListener } from './handlers';
import { registerDevice, deactivateToken, deactivateAllTokens, listenForTokenChanges } from './tokens';
import { getPreferences, updatePreferences, enablePushAndInitializePreferences } from './preferences';
import { isPushAvailable } from './permissions';

class NotificationServiceFacade {
  private responseListener: Notifications.Subscription | null = null;
  private tokenListener: Notifications.Subscription | null = null;

  /**
   * Initialize notification handlers. Called from root layout on startup.
   */
  async initialize() {
    if (Platform.OS === 'web') return;

    configureNotificationHandler();
    await setupAndroidChannels();

    // Avoid adding multiple listeners if re-initialized
    if (!this.responseListener) {
      this.responseListener = addNotificationResponseListener();
    }
  }

  /**
   * Attempt to register device and start listening for token rotation.
   * Only does something if the user previously granted permission.
   */
  async startTokenSync(userId: string) {
    if (!isPushAvailable()) return;

    await registerDevice(userId);

    if (!this.tokenListener) {
      this.tokenListener = listenForTokenChanges(userId);
    }
  }

  /**
   * Stop token sync and deactivate tokens. Used on logout.
   */
  async cleanup(userId: string) {
    await deactivateAllTokens(userId);

    if (this.tokenListener) {
      this.tokenListener.remove();
      this.tokenListener = null;
    }
    // Note: We don't remove responseListener so deep links work if a different user logs in,
    // or if the app is foregrounded without a user change.
  }

  // --- Expose encapsulated methods ---

  isPushAvailable = isPushAvailable;
  registerDevice = registerDevice;
  deactivateToken = deactivateToken;
  
  getPreferences = getPreferences;
  updatePreferences = updatePreferences;
  enablePushAndInitializePreferences = enablePushAndInitializePreferences;
}

export const NotificationService = new NotificationServiceFacade();
