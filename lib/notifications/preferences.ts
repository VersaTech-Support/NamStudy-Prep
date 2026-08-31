// ─── Notification Preferences ──────────────────────────────────────────────
// Manages the user's notification preferences synced with Supabase.

import { supabase } from '@/lib/supabase';
import { NotificationPreferences, DEFAULT_PREFERENCES } from './types';

/**
 * Fetch a user's notification preferences.
 * If they don't exist, returns the DEFAULT_PREFERENCES.
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Notifications] Failed to fetch preferences:', error.message);
      return { ...DEFAULT_PREFERENCES, user_id: userId, updated_at: new Date().toISOString() };
    }

    if (!data) {
      // Return defaults if no record exists
      return { ...DEFAULT_PREFERENCES, user_id: userId, updated_at: new Date().toISOString() };
    }

    return data as NotificationPreferences;
  } catch (err) {
    console.error('[Notifications] Preferences fetch exception:', err);
    return { ...DEFAULT_PREFERENCES, user_id: userId, updated_at: new Date().toISOString() };
  }
}

/**
 * Update the user's notification preferences.
 * This function upserts the preferences row.
 */
export async function updatePreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>
): Promise<boolean> {
  try {
    // We first get existing to merge, since we are doing an upsert and might not have a full row if it's new.
    const current = await getPreferences(userId);
    const newPrefs = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(newPrefs, { onConflict: 'user_id' });

    if (error) {
      console.error('[Notifications] Failed to update preferences:', error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[Notifications] Preferences update exception:', err);
    return false;
  }
}

/**
 * Convenience method called when a user first opts-in via the onboarding UI.
 */
export async function enablePushAndInitializePreferences(userId: string): Promise<boolean> {
  return updatePreferences(userId, { push_enabled: true });
}
