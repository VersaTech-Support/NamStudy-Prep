import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { getUserMastery } from '@/lib/learning/mastery';
import { TopicMastery } from '@/lib/learning/types';
import ProgressBar from '@/components/ui/ProgressBar';
import AuthModal from '@/components/AuthModal';

// ─── Types ──────────────────────────────────────────────────────────────────

type TabKey = 'strengths' | 'weaknesses' | 'declining';

interface CategorizedTopics {
  strengths: TopicMastery[];
  weaknesses: TopicMastery[];
  declining: TopicMastery[];
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function StrengthsWeaknessesScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('weaknesses');
  const [authVisible, setAuthVisible] = useState(false);
  const [data, setData] = useState<CategorizedTopics>({
    strengths: [],
    weaknesses: [],
    declining: [],
  });

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const mastery = await getUserMastery(user.id);
      const topics = mastery.topicMastery;

      const categorized: CategorizedTopics = {
        strengths: [],
        weaknesses: [],
        declining: [],
      };

      for (const t of topics) {
        if (t.trend === 'DECLINING') {
          categorized.declining.push(t);
        } else if (t.masteryScore >= 70) {
          categorized.strengths.push(t);
        } else {
          categorized.weaknesses.push(t);
        }
      }

      // Sort: weaknesses lowest first, strengths highest first, declining by score
      categorized.weaknesses.sort((a, b) => a.masteryScore - b.masteryScore);
      categorized.strengths.sort((a, b) => b.masteryScore - a.masteryScore);
      categorized.declining.sort((a, b) => a.masteryScore - b.masteryScore);

      setData(categorized);
    } catch (err) {
      console.error('Failed to load strengths/weaknesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const TAB_CONFIG: { key: TabKey; label: string; icon: string; color: string; emptyTitle: string; emptyDesc: string }[] = [
    {
      key: 'weaknesses',
      label: 'Weak',
      icon: 'alert-circle',
      color: COLORS.red,
      emptyTitle: 'No weak topics!',
      emptyDesc: 'Great job — keep practicing to maintain your scores.',
    },
    {
      key: 'declining',
      label: 'Declining',
      icon: 'trending-down',
      color: COLORS.gold,
      emptyTitle: 'No declining topics',
      emptyDesc: 'Your scores are stable. Keep studying regularly.',
    },
    {
      key: 'strengths',
      label: 'Strong',
      icon: 'checkmark-circle',
      color: COLORS.green,
      emptyTitle: 'No strong topics yet',
      emptyDesc: 'Score 70%+ on quizzes to build your strengths.',
    },
  ];

  const activeConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;
  const activeTopics = data[activeTab];

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Strengths & Weaknesses</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="pulse-outline" size={64} color={COLORS.textMuted} />
          <Text style={{ ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md }}>Sign In Required</Text>
          <Text style={{ ...FONTS.body, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs, maxWidth: 280 }}>
            Sign in to see your strengths and weaknesses across all topics.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.lg }}
            onPress={() => setAuthVisible(true)}
          >
            <Text style={{ ...FONTS.bodyBold, color: COLORS.white }}>Sign In</Text>
          </TouchableOpacity>
        </View>
        <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Strengths & Weaknesses</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = data[tab.key].length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && { borderBottomColor: tab.color, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon as any} size={18} color={isActive ? tab.color : COLORS.textMuted} />
              <Text style={[styles.tabLabel, isActive && { color: tab.color, fontWeight: '700' }]}>
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTopics.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name={activeConfig.icon as any} size={48} color={activeConfig.color + '40'} />
              <Text style={styles.emptyTitle}>{activeConfig.emptyTitle}</Text>
              <Text style={styles.emptyDesc}>{activeConfig.emptyDesc}</Text>
            </View>
          ) : (
            activeTopics.map((topic) => (
              <TouchableOpacity
                key={topic.topic_id}
                style={styles.topicCard}
                onPress={() => router.push(`/topic/${topic.topic_id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.topicHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topicName} numberOfLines={1}>{topic.topic_name}</Text>
                    <Text style={styles.topicSubject}>{topic.subject}</Text>
                  </View>
                  <Text style={[styles.topicScore, { color: activeConfig.color }]}>
                    {topic.masteryScore}%
                  </Text>
                </View>
                <ProgressBar
                  progress={topic.masteryScore / 100}
                  color={activeConfig.color}
                  height={6}
                />
                <View style={styles.topicMeta}>
                  <Text style={styles.metaText}>
                    {topic.attempts} attempt{topic.attempts !== 1 ? 's' : ''}
                  </Text>
                  {topic.trend !== 'INSUFFICIENT_DATA' && (
                    <View style={styles.trendChip}>
                      <Ionicons
                        name={topic.trend === 'IMPROVING' ? 'trending-up' : topic.trend === 'DECLINING' ? 'trending-down' : 'remove'}
                        size={12}
                        color={topic.trend === 'IMPROVING' ? COLORS.green : topic.trend === 'DECLINING' ? COLORS.red : COLORS.textMuted}
                      />
                      <Text style={[styles.trendText, {
                        color: topic.trend === 'IMPROVING' ? COLORS.green : topic.trend === 'DECLINING' ? COLORS.red : COLORS.textMuted,
                      }]}>
                        {topic.trend.charAt(0) + topic.trend.slice(1).toLowerCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  scrollContent: {
    padding: SPACING.lg,
  },

  // Topic cards
  topicCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  topicName: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  topicSubject: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  topicScore: {
    ...FONTS.h3,
    marginLeft: SPACING.md,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  metaText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    ...FONTS.small,
    fontWeight: '600',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyDesc: {
    ...FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
});
