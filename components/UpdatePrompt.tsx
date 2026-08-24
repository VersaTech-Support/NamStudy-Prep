import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { supabase } from '@/lib/supabase';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';

interface AppConfig {
  latest_version: string;
  force_update: boolean | null;
  download_url: string;
}

/**
 * Compare two semantic version strings (e.g. "1.2.3" vs "1.3.0").
 * Returns true if remoteVersion is greater than localVersion.
 */
function isNewerVersion(localVersion: string, remoteVersion: string): boolean {
  const local = localVersion.split('.').map(Number);
  const remote = remoteVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(local.length, remote.length); i++) {
    const l = local[i] || 0;
    const r = remote[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

export default function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('latest_version, force_update, download_url')
        .limit(1)
        .single();

      if (error || !data) {
        // Silently fail — don't block app usage if the table is unreachable
        return;
      }

      const currentVersion =
        Application.nativeApplicationVersion ?? '1.0.0';

      if (isNewerVersion(currentVersion, data.latest_version)) {
        setConfig(data);
        setVisible(true);
      }
    } catch (err) {
      // Silently fail on network or parsing errors
      console.warn('Update check failed:', err);
    }
  };

  const handleDownload = () => {
    if (config?.download_url) {
      Linking.openURL(config.download_url).catch(() => {
        console.warn('Could not open download URL');
      });
    }
  };

  if (!visible || !config) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {
        if (!config.force_update) setVisible(false);
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download" size={48} color={COLORS.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Major Update Available!</Text>

          {/* Description */}
          <Text style={styles.description}>
            A new core version of NamStudy Prep is required. Please download the
            latest update to continue your exam prep.
          </Text>

          {/* Version info */}
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Current</Text>
            <Text style={styles.versionValue}>
              v{Application.nativeApplicationVersion ?? '1.0.0'}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.textMuted} />
            <Text style={styles.versionLabel}>Latest</Text>
            <Text style={[styles.versionValue, { color: COLORS.green }]}>
              v{config.latest_version}
            </Text>
          </View>

          {/* Download button */}
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <Ionicons name="download" size={20} color={COLORS.white} />
            <Text style={styles.downloadBtnText}>Download Update</Text>
          </TouchableOpacity>

          {/* Dismiss button — only if NOT a forced update */}
          {!config.force_update && (
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => setVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissBtnText}>Remind Me Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
  },
  versionLabel: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  versionValue: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
  },
  downloadBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },
  dismissBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  dismissBtnText: {
    ...FONTS.body,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});
