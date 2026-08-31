import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { NotificationService } from '@/lib/notifications/service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_SEEN_KEY = '@namstudy_notification_onboarding_seen';

interface Props {
  userId: string;
}

export default function NotificationOnboarding({ userId }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, [userId]);

  const checkEligibility = async () => {
    if (!NotificationService.isPushAvailable()) return;

    try {
      // 1. Check if they've seen this before
      const hasSeen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
      if (hasSeen === 'true') {
        // If they've seen it and previously enabled push, we should blindly attempt to sync the token.
        // This handles cases where they get a new device or the token rotated while the app was closed.
        const prefs = await NotificationService.getPreferences(userId);
        if (prefs.push_enabled) {
          NotificationService.startTokenSync(userId);
        }
        return;
      }

      // 2. Check if they already have preferences stored in Supabase
      const prefs = await NotificationService.getPreferences(userId);
      if (prefs.push_enabled) {
        // Already opted in on another device
        await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
        NotificationService.startTokenSync(userId);
        return;
      }

      // If we made it here, they haven't seen the prompt and aren't enabled yet
      setVisible(true);
    } catch (err) {
      console.error('[NotificationOnboarding] Eligibility check failed:', err);
    }
  };

  const handleEnable = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
      
      // Update DB to enable push
      await NotificationService.enablePushAndInitializePreferences(userId);
      
      // Trigger the OS prompt and token sync
      await NotificationService.startTokenSync(userId);
      
      setVisible(false);
    } catch (err) {
      console.error('[NotificationOnboarding] Enable failed:', err);
      setVisible(false);
    }
  };

  const handleNotNow = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
      setVisible(false);
    } catch (err) {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleNotNow}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={32} color={COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Stay on top of your study goals</Text>
          <Text style={styles.subtitle}>Get helpful reminders about:</Text>
          
          <View style={styles.list}>
            <View style={styles.listItem}>
              <Ionicons name="flame" size={20} color={COLORS.gold} />
              <Text style={styles.listText}>Study streaks</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="bar-chart" size={20} color={COLORS.accent} />
              <Text style={styles.listText}>Topics to revisit</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="calendar" size={20} color={COLORS.red} />
              <Text style={styles.listText}>Exam dates</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.enableButton} onPress={handleEnable} activeOpacity={0.8}>
              <Text style={styles.enableButtonText}>Enable Notifications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.notNowButton} onPress={handleNotNow} activeOpacity={0.8}>
              <Text style={styles.notNowButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // Slide up from bottom like a bottom sheet
  },
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xxxl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xxxl, // safe area padding
    ...SHADOWS.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    alignSelf: 'center',
  },
  title: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  list: {
    marginBottom: SPACING.xl,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 250,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  listText: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  actions: {
    gap: SPACING.md,
  },
  enableButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  enableButtonText: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  notNowButton: {
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  notNowButtonText: {
    ...FONTS.bodyBold,
    color: COLORS.textMuted,
  },
});
