import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TopicRow {
  id: string;
  name: string;
  icon?: string | null;
  estimatedMinutes?: number | null;
  contentProgressPercent: number;
  hasNotes: boolean;
  hasQuiz: boolean;
  hasFlashcards: boolean;
  difficulty?: string | null;
}

interface SectionCardProps {
  /** Section name from topic_sections */
  title: string;
  /** Optional section description */
  description?: string | null;
  /** Topics in this section */
  topics: TopicRow[];
  /** Number of completed topics (progress >= 90%) */
  completedCount?: number;
  /** Callback when a topic row is tapped */
  onTopicPress?: (topicId: string) => void;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Section accent color (inherits from subject) */
  accentColor?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SectionCard({
  title,
  description,
  topics,
  completedCount = 0,
  onTopicPress,
  defaultExpanded = false,
  accentColor = COLORS.primary,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const progressText = topics.length > 0
    ? `${completedCount}/${topics.length} complete`
    : 'No topics';

  return (
    <View style={styles.container}>
      {/* Header — always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
        accessibilityLabel={`${title} section, ${progressText}, ${expanded ? 'collapse' : 'expand'}`}
        accessibilityRole="button"
      >
        <View style={[styles.sectionIndicator, { backgroundColor: accentColor }]} />
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.progressText}>{progressText}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {/* Topic list — shown when expanded */}
      {expanded && topics.length > 0 && (
        <View style={styles.topicList}>
          {topics.map((topic, index) => (
            <TouchableOpacity
              key={topic.id}
              style={[
                styles.topicRow,
                index === topics.length - 1 && styles.topicRowLast,
              ]}
              onPress={() => onTopicPress?.(topic.id)}
              activeOpacity={0.7}
              accessibilityLabel={`${topic.name}, ${topic.contentProgressPercent}% complete`}
              accessibilityRole="button"
            >
              {/* Completion indicator */}
              <View
                style={[
                  styles.completionDot,
                  topic.contentProgressPercent >= 90
                    ? { backgroundColor: COLORS.green }
                    : topic.contentProgressPercent > 0
                      ? { backgroundColor: COLORS.gold }
                      : { backgroundColor: COLORS.borderLight },
                ]}
              >
                {topic.contentProgressPercent >= 90 && (
                  <Ionicons name="checkmark" size={10} color={COLORS.white} />
                )}
              </View>

              {/* Topic info */}
              <View style={styles.topicInfo}>
                <Text style={styles.topicName} numberOfLines={1}>{topic.name}</Text>
                <View style={styles.topicMeta}>
                  {topic.estimatedMinutes ? (
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{topic.estimatedMinutes} min</Text>
                    </View>
                  ) : null}
                  {/* Content availability dots */}
                  <View style={styles.availabilityDots}>
                    <View style={[styles.availDot, topic.hasNotes && styles.availDotActive]}>
                      <Text style={[styles.availDotText, topic.hasNotes && styles.availDotTextActive]}>N</Text>
                    </View>
                    <View style={[styles.availDot, topic.hasQuiz && styles.availDotActive]}>
                      <Text style={[styles.availDotText, topic.hasQuiz && styles.availDotTextActive]}>Q</Text>
                    </View>
                    <View style={[styles.availDot, topic.hasFlashcards && styles.availDotActive]}>
                      <Text style={[styles.availDotText, topic.hasFlashcards && styles.availDotTextActive]}>F</Text>
                    </View>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Expanded but no topics */}
      {expanded && topics.length === 0 && (
        <View style={styles.emptyTopics}>
          <Text style={styles.emptyText}>No topics available yet</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  sectionIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  progressText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },

  // Topics
  topicList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  topicRowLast: {
    borderBottomWidth: 0,
  },
  completionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  availabilityDots: {
    flexDirection: 'row',
    gap: 4,
  },
  availDot: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availDotActive: {
    backgroundColor: COLORS.primary + '20',
  },
  availDotText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  availDotTextActive: {
    color: COLORS.primary,
  },

  // Empty
  emptyTopics: {
    padding: SPACING.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  emptyText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});
