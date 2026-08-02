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

interface QuizAttempt {
  id: string;
  topic_name: string;
  score: number;
  total_questions: number;
  subject: string;
  created_at: string;
}

interface SubjectStat {
  subject: string;
  percentage: number;
  attempts: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [overallAvg, setOverallAvg] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Query both tables concurrently to capture records regardless of table naming
      const [attemptsRes, resultsRes] = await Promise.all([
        supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('quiz_results')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
      ]);

      // Combine results from both tables
      const combinedData = [
        ...(attemptsRes.data || []),
        ...(resultsRes.data || []),
      ];

      // Sort combined records by date descending
      combinedData.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (combinedData.length > 0) {
        setAttempts(combinedData as QuizAttempt[]);
        processStats(combinedData as QuizAttempt[]);
      } else {
        setAttempts([]);
        setSubjectStats([]);
        setOverallAvg(0);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (data: QuizAttempt[]) => {
    let totalScore = 0;
    let totalPossible = 0;
    const aggregated: Record<string, { score: number; possible: number; attempts: number }> = {};

    data.forEach((item) => {
      totalScore += item.score;
      totalPossible += item.total_questions;
      
      const sub = item.subject || 'Mathematics'; // Fallback for old records

      if (!aggregated[sub]) {
        aggregated[sub] = { score: 0, possible: 0, attempts: 0 };
      }
      aggregated[sub].score += item.score;
      aggregated[sub].possible += item.total_questions;
      aggregated[sub].attempts += 1;
    });

    setOverallAvg(Math.round((totalScore / totalPossible) * 100) || 0);

    const statsArray = Object.keys(aggregated).map((subject) => ({
      subject,
      percentage: Math.round((aggregated[subject].score / aggregated[subject].possible) * 100),
      attempts: aggregated[subject].attempts,
    }));

    // Sort by highest percentage first
    statsArray.sort((a, b) => b.percentage - a.percentage);
    setSubjectStats(statsArray);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return COLORS.green;
    if (percentage >= 50) return COLORS.gold;
    return COLORS.red;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
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
        <Text style={styles.headerTitle}>Progress & Analytics</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : attempts.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="stats-chart-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>You haven't completed any quizzes yet.</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/quizzes')}>
            <Text style={styles.actionBtnText}>Start a Quiz</Text>
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
              <Text style={styles.overviewValue}>{attempts.length}</Text>
            </View>
          </View>

          {/* Detailed Subject Breakdown */}
          <Text style={styles.sectionTitle}>Subject Performance</Text>
          <View style={styles.breakdownCard}>
            {subjectStats.map((stat, index) => (
              <View key={stat.subject} style={[styles.topicStatRow, index === subjectStats.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.topicStatHeader}>
                  <Text style={styles.topicStatName}>{stat.subject}</Text>
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

          {/* Recent History List */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Recent Attempts</Text>
          <View style={styles.historyCard}>
            {attempts.slice(0, 10).map((attempt, index) => {
              const perc = Math.round((attempt.score / attempt.total_questions) * 100);
              return (
                <View key={attempt.id} style={[styles.historyRow, index === Math.min(10, attempts.length) - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View style={styles.historyIconContainer}>
                    <Ionicons name="checkmark-circle" size={24} color={getProgressColor(perc)} />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyTopic}>{attempt.topic_name}</Text>
                    <Text style={styles.historyDate}>{formatDate(attempt.created_at)}</Text>
                  </View>
                  <View style={styles.historyScoreContainer}>
                    <Text style={[styles.historyPerc, { color: getProgressColor(perc) }]}>{perc}%</Text>
                    <Text style={styles.historyFraction}>{attempt.score}/{attempt.total_questions}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.xl, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { ...FONTS.h1, color: COLORS.white, marginTop: 10 },
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
  sectionTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: SPACING.md },
  breakdownCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  topicStatRow: { marginBottom: SPACING.lg, paddingBottom: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  topicStatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  topicStatName: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  topicStatScore: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  topicAttempts: { ...FONTS.small, color: COLORS.textMuted, marginBottom: SPACING.sm },
  progressBarBg: { height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, width: '100%', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  historyCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  historyIconContainer: { marginRight: SPACING.md },
  historyContent: { flex: 1 },
  historyTopic: { ...FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: 2 },
  historyDate: { ...FONTS.small, color: COLORS.textMuted },
  historyScoreContainer: { alignItems: 'flex-end' },
  historyPerc: { ...FONTS.bodyBold },
  historyFraction: { ...FONTS.small, color: COLORS.textMuted, marginTop: 2 },
});