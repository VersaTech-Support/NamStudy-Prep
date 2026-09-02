import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import SubjectSelectionModal from '@/components/SubjectSelectionModal';
import AuthModal from '@/components/AuthModal';

// ─── Types ──────────────────────────────────────────────────────────
interface SubjectItem {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  gradeName: string;
  topicCount: number;
  masteryPercent: number;
}

// ─── Screen ─────────────────────────────────────────────────────────
export default function LearnScreen() {
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [search, setSearch] = useState('');
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubjects();
    } else {
      setSubjects([]);
      setLoading(false);
    }
  }, [user]);

  const fetchSubjects = async () => {
    if (!user) return;
    setLoading(subjects.length === 0);

    try {
      const items: SubjectItem[] = [];
      const enrolledNames = new Set<string>();

      // ── Relational student_subjects ────────────────────────────────
      const { data: enrollments, error: enrollErr } = await supabase
        .from('student_subjects')
        .select(`
          id,
          curriculum_subject_id,
          curriculum_subjects (
            id, name, icon, color,
            grades ( name )
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

          // Get content progress
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

          let masteryPercent = 0;
          if (progressData && subjectTopicIds.size > 0) {
            const relevantProgress = progressData.filter(
              (p: any) => subjectTopicIds.has(p.topic_id)
            );
            const totalProgress = relevantProgress.reduce(
              (sum: number, p: any) => sum + (p.progress_percent || 0),
              0
            );
            masteryPercent = Math.round(totalProgress / subjectTopicIds.size);
          }

          items.push({
            id: subjectId,
            name: cs.name,
            icon: cs.icon,
            color: cs.color,
            gradeName: cs.grades?.name || '',
            topicCount: topicCount || 0,
            masteryPercent,
          });
        }
      }

      setSubjects(items);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubjects();
  }, [user]);

  const filteredSubjects = subjects.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Explore items ────────────────────────────────────────────────
  const exploreItems = [
    { icon: 'book-outline' as const, title: 'Notes', subtitle: 'Read curriculum notes', route: '/notes' },
    { icon: 'help-circle-outline' as const, title: 'Quizzes', subtitle: 'Test your understanding', route: '/quizzes' },
    { icon: 'document-text-outline' as const, title: 'Past Papers', subtitle: 'Practice exam papers', route: '/papers' },
  ];

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <Text style={styles.headerTitle}>Learn</Text>
          <Text style={styles.headerSubtitle}>Everything needed to master the curriculum</Text>
        </View>
        <EmptyState
          icon="log-in-outline"
          title="Sign in to learn"
          description="Create an account to enroll in subjects and start your learning journey."
          actionText="Sign In"
          onAction={() => setAuthVisible(true)}
          style={{ marginTop: 60 }}
        />
        <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* ─── Header ──────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <Text style={styles.headerTitle}>Learn</Text>
          <Text style={styles.headerSubtitle}>Everything needed to master the curriculum</Text>
        </View>

        {/* ─── Search ──────────────────────────────────────────────── */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search subjects, topics, notes..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* ─── My Subjects ─────────────────────────────────────────── */}
        <View style={styles.sectionPadded}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>My Subjects</Text>
            <TouchableOpacity onPress={() => setSubjectModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <LoadingState text="Loading subjects..." />
          ) : filteredSubjects.length === 0 ? (
            <EmptyState
              icon="book-outline"
              title="No subjects yet"
              description="Add your first subject to start learning."
              actionText="Add Subject"
              onAction={() => setSubjectModalVisible(true)}
              style={styles.emptyCard}
            />
          ) : (
            <View style={styles.subjectList}>
              {filteredSubjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={styles.subjectCard}
                  onPress={() => {
                    router.push(`/subject/${subject.id}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.subjectIcon,
                      { backgroundColor: (subject.color || COLORS.primary) + '18' },
                    ]}
                  >
                    <Ionicons
                      name={(subject.icon as any) || 'book'}
                      size={24}
                      color={subject.color || COLORS.primary}
                    />
                  </View>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectMeta}>
                      {subject.topicCount > 0
                        ? `${subject.topicCount} topics • ${subject.masteryPercent}% mastered`
                        : subject.gradeName || 'Tap to explore'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ─── Explore ─────────────────────────────────────────────── */}
        <View style={styles.sectionPadded}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.exploreList}>
            {exploreItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.exploreCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={22} color={COLORS.textSecondary} />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.exploreTitle}>{item.title}</Text>
                  <Text style={styles.exploreSub}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <SubjectSelectionModal
        visible={subjectModalVisible}
        onClose={() => setSubjectModalVisible(false)}
        onEnrollSuccess={() => {
          setSubjectModalVisible(false);
          fetchSubjects();
        }}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ─── Header ───────────────────────────────────────────────────────
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...FONTS.body,
    color: COLORS.textMuted,
  },

  // ─── Search ───────────────────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.xs,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.textPrimary,
    padding: 0,
  },

  // ─── Sections ─────────────────────────────────────────────────────
  sectionPadded: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },

  // ─── Subject List ─────────────────────────────────────────────────
  subjectList: {
    gap: SPACING.sm,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subjectMeta: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },

  // ─── Explore ──────────────────────────────────────────────────────
  exploreList: {
    gap: SPACING.sm,
  },
  exploreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  exploreTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  exploreSub: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
});
