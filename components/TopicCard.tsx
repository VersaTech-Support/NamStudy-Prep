import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';

const TOPIC_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  'Algebra': { icon: 'calculator', color: '#7C3AED', bg: '#EDE9FE' },
  'Geometry': { icon: 'shapes', color: '#3B82F6', bg: '#DBEAFE' },
  'Statistics': { icon: 'bar-chart', color: '#10B981', bg: '#D1FAE5' },
  'Number': { icon: 'grid', color: '#F59E0B', bg: '#FEF3C7' },
  'Trigonometry': { icon: 'triangle', color: '#EF4444', bg: '#FEE2E2' },
  'Calculus': { icon: 'trending-up', color: '#8B5CF6', bg: '#EDE9FE' },
  'Vectors': { icon: 'arrow-forward', color: '#06B6D4', bg: '#CFFAFE' },
  'Probability': { icon: 'dice', color: '#EC4899', bg: '#FCE7F3' },
  'Functions': { icon: 'git-branch', color: '#14B8A6', bg: '#CCFBF1' },
  'Matrices': { icon: 'apps', color: '#6366F1', bg: '#E0E7FF' },
  'Sequences': { icon: 'list', color: '#F97316', bg: '#FFEDD5' },
};

interface TopicCardProps {
  topicName: string;
  questionCount: number;
  gradeLevel: string;
  isVIP: boolean;
  freeAttemptsLeft?: number;
  isBookmarked?: boolean;
  onPress: () => void;
  onToggleBookmark?: () => void;
}

export default function TopicCard({ topicName, questionCount, gradeLevel, isVIP, freeAttemptsLeft = 3, isBookmarked, onPress, onToggleBookmark }: TopicCardProps) {
  const topicStyle = TOPIC_ICONS[topicName] || { icon: 'help-circle', color: COLORS.primary, bg: COLORS.primaryLight + '30' };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: topicStyle.bg }]}>
          <Ionicons name={topicStyle.icon as any} size={24} color={topicStyle.color} />
        </View>
        <View style={styles.topRight}>
          {onToggleBookmark && (
            <TouchableOpacity
              style={styles.bookmarkBtn}
              onPress={onToggleBookmark}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isBookmarked ? 'heart' : 'heart-outline'}
                size={20}
                color={isBookmarked ? '#EF4444' : COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
          {!isVIP && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>{freeAttemptsLeft} free</Text>
            </View>
          )}
          {isVIP && (
            <View style={styles.vipBadge}>
              <Ionicons name="infinite" size={14} color={COLORS.gold} />
            </View>
          )}
        </View>
      </View>

      <Text style={styles.topicName}>{topicName}</Text>
      <Text style={styles.questionCount}>{questionCount} questions</Text>

      <View style={[styles.gradePill, { 
        backgroundColor: gradeLevel === 'NSSCO' ? COLORS.greenLight : COLORS.goldLight 
      }]}>
        <Text style={[styles.gradeText, { 
          color: gradeLevel === 'NSSCO' ? COLORS.greenDark : COLORS.goldDark 
        }]}>
          {gradeLevel}
        </Text>
      </View>

      <View style={styles.startRow}>
        <Text style={[styles.startText, { color: topicStyle.color }]}>Start Quiz</Text>
        <Ionicons name="arrow-forward" size={16} color={topicStyle.color} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '48%',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bookmarkBtn: {
    padding: 4,
  },
  freeBadge: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  freeBadgeText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  vipBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicName: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  questionCount: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  gradePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  gradeText: {
    ...FONTS.small,
    fontWeight: '700',
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  startText: {
    ...FONTS.caption,
    fontWeight: '700',
  },
});
