import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

type ConfidenceLevel = 'need_help' | 'still_learning' | 'almost_there' | 'confident';

interface ConfidenceOption {
  level: ConfidenceLevel;
  emoji: string;
  label: string;
  color: string;
}

interface ConfidenceCheckProps {
  /** Topic ID to save confidence for */
  topicId: string;
  /** User ID */
  userId: string;
  /** Callback after confidence is saved */
  onComplete?: (level: ConfidenceLevel) => void;
  /** Topic name for display */
  topicName?: string;
}

// ─── Options ────────────────────────────────────────────────────────────────

const OPTIONS: ConfidenceOption[] = [
  { level: 'need_help', emoji: '😵', label: 'Need Help', color: COLORS.red },
  { level: 'still_learning', emoji: '😕', label: 'Still Learning', color: COLORS.gold },
  { level: 'almost_there', emoji: '🙂', label: 'Almost There', color: COLORS.accent },
  { level: 'confident', emoji: '🔥', label: 'Confident', color: COLORS.green },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ConfidenceCheck({
  topicId,
  userId,
  onComplete,
  topicName,
}: ConfidenceCheckProps) {
  const [selected, setSelected] = useState<ConfidenceLevel | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (level: ConfidenceLevel) => {
    setSelected(level);
    setSaving(true);

    try {
      // Upsert to student_topic_confidence
      const { error } = await supabase
        .from('student_topic_confidence')
        .upsert(
          {
            user_id: userId,
            topic_id: topicId,
            confidence: level,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'topic_id,user_id' }
        );

      if (error) {
        console.error('Failed to save confidence:', error);
      }
    } catch (err) {
      console.error('Confidence save error:', err);
    } finally {
      setSaving(false);
      onComplete?.(level);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="pulse-outline" size={24} color={COLORS.primary} />
        <Text style={styles.title}>How confident do you feel?</Text>
      </View>
      {topicName && (
        <Text style={styles.subtitle}>About: {topicName}</Text>
      )}

      <View style={styles.optionsRow}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.level;
          return (
            <TouchableOpacity
              key={opt.level}
              style={[
                styles.option,
                isSelected && { borderColor: opt.color, backgroundColor: opt.color + '15' },
              ]}
              onPress={() => handleSelect(opt.level)}
              disabled={saving}
              activeOpacity={0.7}
              accessibilityLabel={`${opt.label} confidence`}
              accessibilityRole="button"
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && { color: opt.color, fontWeight: '700' },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selected && (
        <Text style={styles.feedback}>
          {selected === 'need_help' && 'No worries — try reviewing the notes or asking for help.'}
          {selected === 'still_learning' && 'Keep going! Practice makes perfect.'}
          {selected === 'almost_there' && 'Great progress! A quiz will cement your knowledge.'}
          {selected === 'confident' && 'Awesome! You\'re ready to test yourself.'}
        </Text>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  optionLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedback: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
