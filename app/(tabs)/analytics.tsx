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
import AuthModal from '@/components/AuthModal';

import { getUserMastery } from '@/lib/learning/mastery';
import { SubjectMastery, TopicMastery } from '@/lib/learning/types';

// ── View Model for the attempt history row ──────────────────────────
// This is what the JSX actually renders — every field is pre-validated.
interface AttemptViewModel {
  key: string;           // guaranteed unique, safe for React key
  topicDisplay: string;  // pre-validated display string
  dateDisplay: string;   // pre-formatted date string
  score: number | null;
  totalQuestions: number | null;
  percentage: number | null;
}

/** Safely format a date value; returns a fallback for anything invalid. */
function safeDateDisplay(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'Unknown date';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Safely compute a bounded percentage; returns null for invalid data. */
function safePercentage(score: unknown, total: unknown): number | null {
  const s = typeof score === 'number' && isFinite(score) ? score : null;
  const t = typeof total === 'number' && isFinite(total) && total > 0 ? total : null;
  if (s === null || t === null) return null;
  const p = Math.round((s / t) * 100);
  return Math.max(0, Math.min(100, p));
}

/** Normalise one raw attempt (from mastery.ts allAttempts) into a safe ViewModel. */
function normalizeAttempt(raw: any, index: number): AttemptViewModel {
  const score = typeof raw?.score === 'number' ? raw.score : null;
  const totalQuestions = typeof raw?.total_questions === 'number' ? raw.total_questions : null;

  // Build a stable, unique key: prefer the DB id, fall back to index-based
  const rawId = typeof raw?.id === 'string' && raw.id ? raw.id : null;
  const key = rawId ?? `attempt-${index}-${typeof raw?.created_at === 'string' ? raw.created_at : index}`;

  // Topic display: prefer topic_name → subject → fallback
  let topicDisplay = 'Unknown Topic';
  if (typeof raw?.topic_name === 'string' && raw.topic_name.trim()) {
    topicDisplay = raw.topic_name;
  } else if (typeof raw?.subject === 'string' && raw.subject.trim()) {
    topicDisplay = raw.subject;
  }

  return {
    key,
    topicDisplay,
    dateDisplay: safeDateDisplay(raw?.created_at),
    score,
    totalQuestions,
    percentage: safePercentage(score, totalQuestions),
  };
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AttemptViewModel[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectMastery[]>([]);
  const [overallAvg, setOverallAvg] = useState(0);
  const [authVisible, setAuthVisible] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const masteryData = await getUserMastery(user?.id || '');

      setSubjectStats(masteryData.subjectMastery);
      
      // Normalize every attempt into a safe ViewModel BEFORE React touches it
      const rawAttempts: any[] = masteryData.allAttempts || [];
      setAttempts(rawAttempts.map((a, i) => normalizeAttempt(a, i)));

      if (masteryData.subjectMastery.length > 0) {
        let sum = 0;
        let count = 0;
        masteryData.subjectMastery.forEach(s => {
          sum += s.averageMastery;
          count++;
        });
        setOverallAvg(Math.round(sum / count));
      } else {
        setOverallAvg(0);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>Progress</Text>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="stats-chart-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Sign In to Track Progress</Text>
          <Text style={styles.emptyText}>Create an account to view your quiz analytics and mastery data.</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setAuthVisible(true)}>
            <Text style={styles.actionBtnText}>Sign In</Text>
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
                  <Text style={styles.topicStatScore}>{stat.averageMastery}%</Text>
                </View>
                <Text style={styles.topicAttempts}>{stat.totalAttempts} attempt{stat.totalAttempts !== 1 ? 's' : ''}</Text>

                {/* Custom Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${stat.averageMastery}%`,
                        backgroundColor: getProgressColor(stat.averageMastery)
                      }
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
          
          {/* Weak Topics */}
          {subjectStats.some(s => s.weakTopics.length > 0) && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Needs Practice</Text>
              <View style={styles.breakdownCard}>
                {subjectStats.flatMap(s => s.weakTopics).sort((a,b) => a.masteryScore - b.masteryScore).slice(0, 5).map((topic, index, arr) => (
                  <View key={topic.topic_name} style={[styles.topicStatRow, index === arr.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <View style={styles.topicStatHeader}>
                      <Text style={styles.topicStatName}>{topic.topic_name}</Text>
                      <Text style={[styles.topicStatScore, { color: COLORS.red }]}>{topic.masteryScore}%</Text>
                    </View>
                    <Text style={styles.topicAttempts}>{topic.state.replace('_', ' ')}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Recent History List */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Recent Attempts</Text>
          <View style={styles.historyCard}>
            {attempts.slice(0, 10).map((attempt, index) => (
              <View key={attempt.key} style={[styles.historyRow, index === Math.min(10, attempts.length) - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.historyIconContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={attempt.percentage !== null ? getProgressColor(attempt.percentage) : COLORS.textMuted}
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTopic}>{attempt.topicDisplay}</Text>
                  <Text style={styles.historyDate}>{attempt.dateDisplay}</Text>
                </View>
                <View style={styles.historyScoreContainer}>
                  {attempt.percentage !== null ? (
                    <>
                      <Text style={[styles.historyPerc, { color: getProgressColor(attempt.percentage) }]}>
                        {attempt.percentage}%
                      </Text>
                      <Text style={styles.historyFraction}>
                        {attempt.score}/{attempt.totalQuestions}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.historyPerc, { color: COLORS.textMuted }]}>{'\u2014'}</Text>
                  )}
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