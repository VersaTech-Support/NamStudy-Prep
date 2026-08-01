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
import { supabase } from '@/lib/supabase';

interface QuizResult {
  id: string;
  topic_name: string;
  score: number;
  total_questions: number;
  created_at: string;
}

interface TopicStat {
  topic: string;
  percentage: number;
  attempts: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [overallAvg, setOverallAvg] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setResults(data);
        processStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (data: QuizResult[]) => {
    let totalScore = 0;
    let totalPossible = 0;
    const aggregated: Record<string, { score: number; possible: number; attempts: number }> = {};

    data.forEach((item) => {
      totalScore += item.score;
      totalPossible += item.total_questions;

      if (!aggregated[item.topic_name]) {
        aggregated[item.topic_name] = { score: 0, possible: 0, attempts: 0 };
      }
      aggregated[item.topic_name].score += item.score;
      aggregated[item.topic_name].possible += item.total_questions;
      aggregated[item.topic_name].attempts += 1;
    });

    setOverallAvg(Math.round((totalScore / totalPossible) * 100) || 0);

    const statsArray = Object.keys(aggregated).map((topic) => ({
      topic,
      percentage: Math.round((aggregated[topic].score / aggregated[topic].possible) * 100),
      attempts: aggregated[topic].attempts,
    }));

    // Sort by highest percentage first
    statsArray.sort((a, b) => b.percentage - a.percentage);
    setTopicStats(statsArray);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return COLORS.green;
    if (percentage >= 50) return COLORS.gold;
    return COLORS.red;
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Please log in to view your analytics.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="stats-chart-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>Take a few quizzes to see your performance stats!</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.back()}>
            <Text style={styles.actionBtnText}>Start Practicing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Overview Cards */}
          <View style={styles.overviewRow}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Average Score</Text>
              <Text style={[styles.overviewValue, { color: getProgressColor(overallAvg) }]}>
                {overallAvg}%
              </Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Quizzes Taken</Text>
              <Text style={styles.overviewValue}>{results.length}</Text>
            </View>
          </View>

          {/* Strongest & Weakest Topic */}
          {topicStats.length > 1 && (
            <View style={styles.insightsCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightIconContainer}>
                  <Ionicons name="trending-up" size={20} color={COLORS.green} />
                </View>
                <View style={styles.insightTextContent}>
                  <Text style={styles.insightLabel}>Strongest Topic</Text>
                  <Text style={styles.insightTopic}>{topicStats[0].topic}</Text>
                </View>
                <Text style={[styles.insightScore, { color: COLORS.green }]}>{topicStats[0].percentage}%</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.insightRow}>
                <View style={[styles.insightIconContainer, { backgroundColor: COLORS.red + '15' }]}>
                  <Ionicons name="trending-down" size={20} color={COLORS.red} />
                </View>
                <View style={styles.insightTextContent}>
                  <Text style={styles.insightLabel}>Needs Practice</Text>
                  <Text style={styles.insightTopic}>{topicStats[topicStats.length - 1].topic}</Text>
                </View>
                <Text style={[styles.insightScore, { color: COLORS.red }]}>{topicStats[topicStats.length - 1].percentage}%</Text>
              </View>
            </View>
          )}

          {/* Detailed Topic Breakdown */}
          <Text style={styles.sectionTitle}>Topic Breakdown</Text>
          <View style={styles.breakdownCard}>
            {topicStats.map((stat, index) => (
              <View key={stat.topic} style={[styles.topicStatRow, index === topicStats.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.topicStatHeader}>
                  <Text style={styles.topicStatName}>{stat.topic}</Text>
                  <Text style={styles.topicStatScore}>{stat.percentage}%</Text>
                </View>
                <Text style={styles.topicAttempts}>{stat.attempts} attempt{stat.attempts !== 1 ? 's' : ''}</Text>

                {/* Custom Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${stat.percentage}%`,
                        backgroundColor: getProgressColor(stat.percentage)
                      }
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...FONTS.h3, color: COLORS.white },
  scrollContent: { padding: SPACING.xl },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.xs, marginBottom: SPACING.xl, textAlign: 'center' },
  actionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xxl, paddingVertical: 12, borderRadius: RADIUS.md },
  actionBtnText: { ...FONTS.bodyBold, color: COLORS.white },
  overviewRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  overviewCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  overviewLabel: { ...FONTS.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  overviewValue: { fontSize: 32, fontWeight: '800', color: COLORS.textPrimary },
  insightsCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  insightRow: { flexDirection: 'row', alignItems: 'center' },
  insightIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.greenLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  insightTextContent: { flex: 1 },
  insightLabel: { ...FONTS.small, color: COLORS.textMuted },
  insightTopic: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  insightScore: { ...FONTS.h3 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.md },
  sectionTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: SPACING.md },
  breakdownCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  topicStatRow: { marginBottom: SPACING.lg, paddingBottom: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  topicStatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  topicStatName: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  topicStatScore: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  topicAttempts: { ...FONTS.small, color: COLORS.textMuted, marginBottom: SPACING.sm },
  progressBarBg: { height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, width: '100%', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
});