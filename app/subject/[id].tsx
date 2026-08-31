import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, GRADIENTS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';

// Centralized engines
import { getUserMastery } from '@/lib/learning/mastery';
import { getSubjectContentProgress } from '@/lib/learning/contentProgress';
import ProgressBar from '@/components/ui/ProgressBar';
import SectionCard, { TopicRow } from '@/components/ui/SectionCard';

export default function StudentSubjectDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [subject, setSubject] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Progress data
  const [masteryScore, setMasteryScore] = useState(0);
  const [contentProgress, setContentProgress] = useState(0);
  const [topicContentMap, setTopicContentMap] = useState<Record<string, number>>({});
  const [studentSubjectRecord, setStudentSubjectRecord] = useState<any>(null);

  // Content availability lookups
  const [topicHasNotes, setTopicHasNotes] = useState<Set<string>>(new Set());
  const [topicHasQuiz, setTopicHasQuiz] = useState<Set<string>>(new Set());
  const [topicHasFlashcards, setTopicHasFlashcards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id && user) {
      fetchAll();
    }
  }, [id, user]);

  const fetchAll = async () => {
    setLoading(sections.length === 0);
    await Promise.all([
      fetchSubjectData(),
      fetchProgressData(),
      fetchContentAvailability(),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [id, user]);

  const fetchSubjectData = async () => {
    try {
      // Fetch subject details
      const { data: subjectData, error: subError } = await supabase
        .from('curriculum_subjects')
        .select('*, grades(*, curricula(*))')
        .eq('id', id)
        .single();

      if (subError) throw subError;
      setSubject(subjectData);

      // Fetch sections and published topics
      const { data: sectionData, error: secError } = await supabase
        .from('topic_sections')
        .select(`
          *,
          topics (
            id, name, estimated_minutes, publication_status, sequence_order, difficulty, icon
          )
        `)
        .eq('subject_id', id)
        .order('sequence_order', { ascending: true });

      if (secError) throw secError;

      // Filter out non-published topics and sort
      const processedSections = (sectionData || []).map(sec => {
        const publishedTopics = (sec.topics || [])
          .filter((t: any) => t.publication_status === 'published')
          .sort((a: any, b: any) => a.sequence_order - b.sequence_order);
        return { ...sec, topics: publishedTopics };
      });

      setSections(processedSections);
    } catch (err) {
      console.error('Failed to fetch subject:', err);
    }
  };

  const fetchProgressData = async () => {
    if (!user || !id) return;
    try {
      // 1. Student subject enrollment (target grade, exam date)
      const { data: ssData } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('user_id', user.id)
        .eq('curriculum_subject_id', id)
        .single();

      setStudentSubjectRecord(ssData);

      // 2. Content progress (batched, not N+1)
      const contentData = await getSubjectContentProgress(user.id, id);
      setContentProgress(contentData.overallPercent);

      // Build per-topic lookup
      const tcMap: Record<string, number> = {};
      for (const tp of contentData.topicProgress) {
        tcMap[tp.topicId] = tp.progressPercent;
      }
      setTopicContentMap(tcMap);

      // 3. Quiz mastery
      const masteryData = await getUserMastery(user.id);
      // We'll need the subject name to find mastery — get it from state or re-query
      const { data: subjectRow } = await supabase
        .from('curriculum_subjects')
        .select('name')
        .eq('id', id)
        .single();

      if (subjectRow) {
        const currentSubjectMastery = masteryData.subjectMastery.find(
          (sm: any) => sm.subject === subjectRow.name
        );
        if (currentSubjectMastery) {
          setMasteryScore(currentSubjectMastery.averageMastery);
        }
      }
    } catch (err) {
      // Ignore errors for missing progress
    }
  };

  const fetchContentAvailability = async () => {
    if (!id) return;
    try {
      // Get all topic IDs for this subject
      const { data: topics } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', id)
        .eq('publication_status', 'published');

      if (!topics || topics.length === 0) return;
      const topicIds = topics.map(t => t.id);

      // Check for notes content
      const { data: contentRows } = await supabase
        .from('topic_content')
        .select('topic_id')
        .in('topic_id', topicIds)
        .eq('is_published', true);

      const notesSet = new Set<string>();
      for (const row of contentRows || []) {
        notesSet.add(row.topic_id);
      }
      setTopicHasNotes(notesSet);

      // Check for quizzes
      const { data: quizRows } = await supabase
        .from('quizzes')
        .select('topic_id')
        .in('topic_id', topicIds);

      const quizSet = new Set<string>();
      for (const row of quizRows || []) {
        if (row.topic_id) quizSet.add(row.topic_id);
      }
      setTopicHasQuiz(quizSet);

      // Check for flashcards
      const { data: flashcardRows } = await supabase
        .from('flashcards')
        .select('topic_id')
        .in('topic_id', topicIds);

      const fcSet = new Set<string>();
      for (const row of flashcardRows || []) {
        if (row.topic_id) fcSet.add(row.topic_id);
      }
      setTopicHasFlashcards(fcSet);
    } catch {
      // Non-critical — availability dots just won't show
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!subject) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Subject not found.</Text>
      </View>
    );
  }

  // ─── Derived ──────────────────────────────────────────────────────────

  const gradeName = subject.grades?.name || '';
  const currName = subject.grades?.curricula?.name || '';
  const accentColor = subject.color || COLORS.primary;
  const subjectIcon = subject.icon || 'book';

  const totalTopics = sections.reduce((sum: number, sec: any) => sum + sec.topics.length, 0);
  const completedTopics = Object.values(topicContentMap).filter((v: number) => v >= 90).length;

  // Format exam date
  const examDateDisplay = studentSubjectRecord?.exam_date
    ? new Date(studentSubjectRecord.exam_date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not Set';

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
          <Ionicons name={subjectIcon as any} size={32} color={COLORS.white} />
        </View>

        <Text style={styles.subjectTitle}>{subject.name}</Text>
        {(currName || gradeName) && (
          <View style={styles.chipContainer}>
            <Text style={styles.chipText}>
              {currName}{currName && gradeName ? ' • ' : ''}{gradeName}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* ── Progress Card ─────────────────────────────────────────── */}
        <LinearGradient
          colors={GRADIENTS.primary}
          style={styles.progressCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Content Completion (primary metric) */}
          <View style={styles.progressHeaderRow}>
            <View>
              <Text style={styles.progressLabel}>Content Completion</Text>
              <Text style={styles.progressPercentage}>{contentProgress}%</Text>
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressStatsText}>
                {completedTopics}/{totalTopics} topics
              </Text>
            </View>
          </View>
          <ProgressBar
            progress={contentProgress / 100}
            color={COLORS.white}
            height={10}
            style={styles.progressBar}
          />

          {/* Mastery (secondary metric) */}
          <View style={styles.masteryRow}>
            <Ionicons name="school-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.masteryLabel}>Quiz Mastery</Text>
            <Text style={styles.masteryValue}>{masteryScore}%</Text>
          </View>

          {/* Meta badges */}
          <View style={styles.progressDetailsRow}>
            <View style={styles.progressBadge}>
              <Ionicons name="trophy-outline" size={12} color={COLORS.white} />
              <Text style={styles.progressBadgeText}>
                Target: {studentSubjectRecord?.target_grade || 'Not Set'}
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.white} />
              <Text style={styles.progressBadgeText}>
                Exam: {examDateDisplay}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/papers' as any)}
            accessibilityLabel="Past Papers"
          >
            <Ionicons name="document-text-outline" size={20} color={accentColor} />
            <Text style={styles.quickActionText}>Past Papers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/analytics' as any)}
            accessibilityLabel="My Progress"
          >
            <Ionicons name="stats-chart-outline" size={20} color={accentColor} />
            <Text style={styles.quickActionText}>My Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/flashcards' as any)}
            accessibilityLabel="Flashcards"
          >
            <Ionicons name="albums-outline" size={20} color={accentColor} />
            <Text style={styles.quickActionText}>Flashcards</Text>
          </TouchableOpacity>
        </View>

        {/* ── Sections ──────────────────────────────────────────────── */}
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyStateTitle}>Content Coming Soon</Text>
            <Text style={styles.emptyStateText}>
              This subject is being prepared. Check back soon for notes, quizzes, and study materials.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionListTitle}>Syllabus</Text>
            {sections.map((section, idx) => {
              const topicRows: TopicRow[] = section.topics.map((topic: any) => ({
                id: topic.id,
                name: topic.name,
                icon: topic.icon,
                estimatedMinutes: topic.estimated_minutes,
                contentProgressPercent: topicContentMap[topic.id] || 0,
                hasNotes: topicHasNotes.has(topic.id),
                hasQuiz: topicHasQuiz.has(topic.id),
                hasFlashcards: topicHasFlashcards.has(topic.id),
                difficulty: topic.difficulty,
              }));

              const sectionCompleted = topicRows.filter(
                (t) => t.contentProgressPercent >= 90
              ).length;

              return (
                <SectionCard
                  key={section.id}
                  title={section.name}
                  description={section.description}
                  topics={topicRows}
                  completedCount={sectionCompleted}
                  onTopicPress={(topicId) => router.push(`/topic/${topicId}` as any)}
                  defaultExpanded={idx === 0}
                  accentColor={accentColor}
                />
              );
            })}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
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
  errorText: {
    ...FONTS.h3,
    color: COLORS.red,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: SPACING.lg,
    padding: SPACING.xs,
    zIndex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  subjectTitle: {
    ...FONTS.h1,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  chipContainer: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  chipText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },

  // Progress card
  progressCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  progressLabel: {
    ...FONTS.small,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
  },
  progressStats: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  progressStatsText: {
    ...FONTS.small,
    color: COLORS.white,
    fontWeight: '600',
  },
  progressBar: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  masteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  masteryLabel: {
    ...FONTS.small,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  masteryValue: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },
  progressDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  progressBadgeText: {
    ...FONTS.small,
    color: COLORS.white,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  quickActionText: {
    ...FONTS.small,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  // Section list
  sectionListTitle: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyStateTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyStateText: {
    ...FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
