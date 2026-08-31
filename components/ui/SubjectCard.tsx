import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import ProgressBar from './ProgressBar';

// ─── Fallback icon resolver ────────────────────────────────────────────────
// Uses curriculum_subjects.icon when available; falls back to conceptual mapping.
const SUBJECT_ICON_FALLBACKS: Record<string, string> = {
  mathematics: 'calculator',
  maths: 'calculator',
  biology: 'leaf',
  chemistry: 'flask',
  physics: 'pulse',
  'computer science': 'code-slash',
  english: 'text',
  geography: 'globe',
  history: 'time',
  accounting: 'cash',
  business: 'briefcase',
  economics: 'trending-up',
  art: 'color-palette',
  music: 'musical-notes',
};

function resolveIcon(icon: string | null | undefined, subjectName: string): string {
  if (icon) return icon;
  const key = subjectName.toLowerCase();
  return SUBJECT_ICON_FALLBACKS[key] || 'book';
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface SubjectCardProps {
  /** Display name of the subject */
  name: string;
  /** Ionicons icon name from curriculum_subjects.icon */
  icon?: string | null;
  /** Accent color from curriculum_subjects.color */
  color?: string | null;
  /** Curriculum name (e.g., "NSSCAS", "CAIE") */
  curriculum?: string;
  /** Grade/level name (e.g., "Grade 12", "AS Level") */
  grade?: string;
  /** Total number of published topics in this subject */
  topicCount?: number;
  /** Content completion percentage (0–100) */
  completionPercent?: number;
  /** Mastery percentage (0–100), shown as secondary indicator */
  masteryPercent?: number | null;
  /** Callback when the card is tapped */
  onPress?: () => void;
  /** Visual variant */
  variant?: 'default' | 'compact';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SubjectCard({
  name,
  icon,
  color,
  curriculum,
  grade,
  topicCount,
  completionPercent = 0,
  masteryPercent,
  onPress,
  variant = 'default',
}: SubjectCardProps) {
  const accentColor = color || COLORS.primary;
  const resolvedIcon = resolveIcon(icon, name);
  const chipText = [curriculum, grade].filter(Boolean).join(' • ');

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={`${name} subject`}
        accessibilityRole="button"
      >
        <View style={[styles.compactIconContainer, { backgroundColor: accentColor }]}>
          <Ionicons name={resolvedIcon as any} size={20} color={COLORS.white} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
          {chipText ? <Text style={styles.compactChip}>{chipText}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${name} subject, ${completionPercent}% complete`}
      accessibilityRole="button"
    >
      {/* Icon + Identity */}
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
          <Ionicons name={resolvedIcon as any} size={28} color={COLORS.white} />
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {chipText ? (
            <View style={styles.chipContainer}>
              <Text style={styles.chipText}>{chipText}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressLabel}>
            {typeof topicCount === 'number' ? `${topicCount} topics` : 'Progress'}
          </Text>
          <Text style={styles.progressValue}>{completionPercent}%</Text>
        </View>
        <ProgressBar
          progress={completionPercent / 100}
          color={accentColor}
          height={6}
        />
      </View>

      {/* Mastery (secondary indicator) */}
      {masteryPercent !== null && masteryPercent !== undefined && (
        <View style={styles.masteryRow}>
          <Ionicons name="school-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.masteryText}>Mastery: {masteryPercent}%</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  identity: {
    flex: 1,
  },
  name: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  chipContainer: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  chipText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: SPACING.xs,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  progressLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  progressValue: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  masteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  masteryText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },

  // Compact variant
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  compactContent: {
    flex: 1,
  },
  compactName: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  compactChip: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
});
