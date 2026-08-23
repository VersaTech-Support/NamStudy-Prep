import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, RADIUS, SPACING } from '@/constants/theme';
import { StudyRecommendation } from '@/lib/learning/types';

interface RecommendationCardProps {
  recommendation: StudyRecommendation;
  onPress: () => void;
}

export default function RecommendationCard({ recommendation, onPress }: RecommendationCardProps) {
  
  const getIcon = () => {
    switch (recommendation.type) {
      case 'topic_quiz': return 'fitness';
      case 'flashcards': return 'albums';
      case 'past_paper': return 'document-text';
      case 'review_topic': return 'book';
      case 'continue': return 'play-circle';
      default: return 'star';
    }
  };

  const getIconColor = () => {
    switch (recommendation.type) {
      case 'topic_quiz': return COLORS.accent;
      case 'flashcards': return COLORS.gold;
      case 'past_paper': return COLORS.green;
      case 'review_topic': return COLORS.primary;
      case 'continue': return COLORS.primary;
      default: return COLORS.textMuted;
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: getIconColor() + '20' }]}>
          <Ionicons name={getIcon()} size={24} color={getIconColor()} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{recommendation.title}</Text>
          <Text style={styles.description}>{recommendation.description}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
        <Text style={styles.reason}>{recommendation.reason}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  description: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  reason: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginLeft: 6,
    flex: 1,
  },
});
