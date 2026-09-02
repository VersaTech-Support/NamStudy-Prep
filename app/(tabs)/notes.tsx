import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

import ScreenHeader from '@/components/ui/ScreenHeader';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import SubjectCard from '@/components/ui/SubjectCard';
import SubjectSelectionModal from '@/components/SubjectSelectionModal';
import AuthModal from '@/components/AuthModal';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EnrolledSubjectView {
  enrollmentId: string;
  subjectId: string;
  name: string;
  icon: string | null;
  color: string | null;
  curriculumName: string;
  gradeName: string;
  topicCount: number;
  completionPercent: number;
  masteryPercent: number | null;
  targetGrade: string | null;
  examDate: string | null;
}
type SubjectView = EnrolledSubjectView;

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function NotesScreen() {
  const { user } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<SubjectView[]>([]);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEnrolledSubjects();
    } else {
      setSubjects([]);
      setLoading(false);
    }
  }, [user]);

  const fetchEnrolledSubjects = async () => {
    if (!user) return;
    setLoading(subjects.length === 0);

    try {
      const allViews: SubjectView[] = [];
      const enrolledNames = new Set<string>();

      // ── SOURCE 1: Relational student_subjects (preferred) ──────────
      const { data: enrollments, error: enrollErr } = await supabase
        .from('student_subjects')
        .select(`
          id,
          target_grade,
          exam_date,
          curriculum_subject_id,
          curriculum_subjects (
            id, name, icon, color,
            grades (
              name,
              curricula ( name )
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!enrollErr && enrollments && enrollments.length > 0) {
        for (const enrollment of enrollments) {
          const cs = enrollment.curriculum_subjects as any;
          if (!cs) continue;

          const subjectId = cs.id;
          enrolledNames.add(cs.name);

          // Count published topics
          const { count: topicCount } = await supabase
            .from('topics')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', subjectId)
            .eq('publication_status', 'published');

          // Get content progress using the batched utility
          const { data: progressData } = await supabase
            .from('student_content_progress')
            .select('progress_percent, topic_id')
            .eq('user_id', user.id);

          const { data: subjectTopics } = await supabase
            .from('topics')
            .select('id')
            .eq('subject_id', subjectId)
            .eq('publication_status', 'published');

          const subjectTopicIds = new Set(
            (subjectTopics || []).map((t: any) => t.id)
          );

          let completionPercent = 0;
          if (progressData && subjectTopicIds.size > 0) {
            const relevantProgress = progressData.filter(
              (p: any) => subjectTopicIds.has(p.topic_id)
            );
            const totalProgress = relevantProgress.reduce(
              (sum: number, p: any) => sum + (p.progress_percent || 0),
              0
            );
            completionPercent = Math.round(totalProgress / subjectTopicIds.size);
          }

          allViews.push({
            enrollmentId: enrollment.id,
            subjectId,
            name: cs.name,
            icon: cs.icon,
            color: cs.color,
            curriculumName: cs.grades?.curricula?.name || '',
            gradeName: cs.grades?.name || '',
            topicCount: topicCount || 0,
            completionPercent,
            masteryPercent: null,
            targetGrade: enrollment.target_grade,
            examDate: enrollment.exam_date,
          });
        }
      }

      setSubjects(allViews);
    } catch (err) {
      console.error('Failed to fetch enrolled subjects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEnrolledSubjects();
  }, [user]);

  // ─── Unauthenticated ──────────────────────────────────────────────────

  if (!user) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Notes" subtitle="Your learning library" />
        <EmptyState
          icon="book-outline"
          title="Sign in to study"
          description="Create an account to build your personalised learning library, track your progress, and get recommendations."
          actionText="Sign In"
          onAction={() => setAuthVisible(true)}
          style={styles.emptyCard}
        />
        <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
      </View>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Notes" subtitle="Your learning library" />
        <LoadingState text="Loading your subjects…" />
      </View>
    );
  }

  // ─── Authenticated ────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notes" subtitle="Your learning library" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* My Subjects */}
        <View style={styles.section}>
          <SectionHeader
            title="My Subjects"
            actionText="Add Subject"
            onAction={() => setSubjectModalVisible(true)}
          />

          {subjects.length > 0 ? (
            subjects.map((subject, idx) => {
              // Relational subject — full card with progress
              return (
                <SubjectCard
                  key={subject.enrollmentId}
                  name={subject.name}
                  icon={subject.icon}
                  color={subject.color}
                  curriculum={subject.curriculumName}
                  grade={subject.gradeName}
                  topicCount={subject.topicCount}
                  completionPercent={subject.completionPercent}
                  masteryPercent={subject.masteryPercent}
                  onPress={() => router.push(`/subject/${subject.subjectId}` as any)}
                />
              );
            })
          ) : (
            <EmptyState
              icon="library-outline"
              title="Build your study library"
              description="Add your first subject to begin studying. Your notes, quizzes, and progress will all be organised around your subjects."
              actionText="Add Your First Subject"
              onAction={() => setSubjectModalVisible(true)}
              style={styles.emptyCard}
            />
          )}
        </View>

        {/* Explore */}
        {subjects.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Explore" />
            <TouchableOpacity
              style={styles.exploreCard}
              onPress={() => setSubjectModalVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Explore and add more subjects"
              accessibilityRole="button"
            >
              <View style={styles.exploreIconBg}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.exploreContent}>
                <Text style={styles.exploreTitle}>Add Another Subject</Text>
                <Text style={styles.exploreSubtitle}>
                  Browse available curricula and courses
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SubjectSelectionModal
        visible={subjectModalVisible}
        onClose={() => setSubjectModalVisible(false)}
        onEnrollSuccess={() => {
          setSubjectModalVisible(false);
          fetchEnrolledSubjects();
        }}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 100,
  },
  section: {
    marginBottom: SPACING.xxl,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  exploreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
  },
  exploreIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  exploreContent: {
    flex: 1,
  },
  exploreTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  exploreSubtitle: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
});
