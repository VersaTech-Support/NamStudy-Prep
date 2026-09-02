import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, GRADIENTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

// Reusable Components
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import ProgressBar from '@/components/ui/ProgressBar';
import PremiumBadge from '@/components/ui/PremiumBadge';
import AuthModal from '@/components/AuthModal';

import { getUserMastery } from '@/lib/learning/mastery';
import { getNextBestActions } from '@/lib/learning/recommendations';
import { SubjectMastery, StudyRecommendation, TopicMastery } from '@/lib/learning/types';
import SubjectSelectionModal from '@/components/SubjectSelectionModal';

import { FEATURES } from '@/constants/features';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user, isPro, streak } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [authVisible, setAuthVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Stats (Unauthenticated)
  const [counts, setCounts] = useState({ papers: 0, quizzes: 0, students: 0, teachers: 0 });

  // Personalized Data (Authenticated)
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectMastery[]>([]);
  const [recentTopic, setRecentTopic] = useState<TopicMastery | null>(null);
  
  // Subject Enrollment
  const [enrolledSubjects, setEnrolledSubjects] = useState<any[]>([]);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);

  // Continue Reading (last viewed notes)
  const [lastViewedTopic, setLastViewedTopic] = useState<{ topicId: string; topicName: string; progressPercent: number; subjectName: string } | null>(null);

  // Exam Countdown (Assume Nov 1st of current year)
  const daysToExam = React.useMemo(() => {
    const today = new Date();
    let examDate = new Date(today.getFullYear(), 10, 1);
    if (today > examDate) examDate = new Date(today.getFullYear() + 1, 10, 1);
    const diffTime = Math.abs(examDate.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  useEffect(() => {
    if (user) {
      fetchAuthenticatedData();
    } else {
      fetchUnauthenticatedData();
    }
  }, [user]);

  const fetchUnauthenticatedData = async () => {
    setLoading(true);
    try {
      const { count: pCount } = await supabase.from('papers').select('*', { count: 'exact', head: true });
      const { count: qCount } = await supabase.from('quizzes').select('*', { count: 'exact', head: true });
      const { data: usersData } = await supabase.from('users').select('role, is_admin');
      
      let parsedStudentCount = 0;
      let parsedTeacherCount = 0;
      if (usersData) {
        usersData.forEach((u: any) => {
          if (u.role === 'teacher') parsedTeacherCount++;
          else if (u.role === 'student' || (!u.role && !u.is_admin)) parsedStudentCount++;
        });
      }
      setCounts({ papers: pCount || 0, quizzes: qCount || 0, students: parsedStudentCount, teachers: parsedTeacherCount });
    } catch (err) {}
    setLoading(false);
  };

  const fetchAuthenticatedData = async () => {
    setLoading(true);
    try {
      const masteryData = await getUserMastery(user?.id || '');
      
      setSubjectStats(masteryData.subjectMastery);
      setRecentTopic(masteryData.topicMastery.length > 0 ? masteryData.topicMastery[0] : null);

      const nextActions = getNextBestActions({
        topicMastery: masteryData.topicMastery,
        subjectMastery: masteryData.subjectMastery,
        userSubjects: user?.subjects || ['Mathematics'],
        daysUntilExam: daysToExam,
        isPro: isPro,
      });

      setRecommendations(nextActions);

      // Fetch Enrolled Subjects
      const { data: studentSubjects, error: ssError } = await supabase
        .from('student_subjects')
        .select(`
          *,
          curriculum_subjects (
            *,
            grades (*)
          )
        `)
        .eq('user_id', user?.id || '')
        .eq('is_active', true);
        
      if (ssError) console.error('Error fetching student subjects:', ssError);
      if (studentSubjects) setEnrolledSubjects(studentSubjects);

      // Fetch last viewed topic from content progress
      const { data: lastViewed } = await supabase
        .from('student_content_progress')
        .select('topic_id, progress_percent, topics(name, curriculum_subjects:subject_id(name))')
        .eq('user_id', user?.id || '')
        .order('last_viewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastViewed) {
        const topicData = lastViewed.topics as any;
        setLastViewedTopic({
          topicId: lastViewed.topic_id,
          progressPercent: lastViewed.progress_percent || 0,
          topicName: topicData?.name || 'Unknown Topic',
          subjectName: topicData?.curriculum_subjects?.name || '',
        });
      }
      
    } catch (err) {
      console.error('Failed to fetch authenticated data:', err);
    }
    setLoading(false);
  };

  // ─── Get greeting based on time of day ────────────────────────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ─── Determine the best "continue learning" item ──────────────────
  const getContinueLearningData = () => {
    // Prefer notes progress over quiz mastery
    if (lastViewedTopic && lastViewedTopic.progressPercent < 100) {
      return {
        title: lastViewedTopic.topicName,
        subtitle: lastViewedTopic.subjectName,
        progress: lastViewedTopic.progressPercent,
        onPress: () => router.push(`/topic/${lastViewedTopic.topicId}/notes` as any),
      };
    }
    if (recentTopic) {
      return {
        title: recentTopic.topic_name,
        subtitle: 'Recent quiz activity',
        progress: recentTopic.masteryScore,
        onPress: () => recentTopic.topic_id
          ? router.push(`/topic/${recentTopic.topic_id}`)
          : router.push({ pathname: '/quiz/[topic]', params: { topic: recentTopic.topic_name, gradeLevel: user?.grade_level || 'NSSCO' } }),
      };
    }
    return null;
  };

  // ─── Quick Access items matching Figma ────────────────────────────
  const quickAccessItems = [
    {
      icon: 'chatbubbles-outline' as const,
      title: 'AI Tutor',
      subtitle: 'Ask NamTutor',
      color: '#10B981',
      onPress: () => { if (FEATURES.ENABLE_NAMTUTOR) router.push('/tutor'); },
      disabled: !FEATURES.ENABLE_NAMTUTOR,
    },
    {
      icon: 'albums-outline' as const,
      title: 'Flashcards',
      subtitle: 'Review & remember',
      color: '#10B981',
      onPress: () => router.push('/flashcards'),
    },
    {
      icon: 'fitness-outline' as const,
      title: 'Target Test',
      subtitle: 'Practice weak topics',
      color: '#10B981',
      onPress: () => router.push('/target-test' as any),
      disabled: !FEATURES.ENABLE_TARGET_TEST,
    },
    {
      icon: 'calendar-outline' as const,
      title: 'Study Planner',
      subtitle: 'Plan your session',
      color: '#10B981',
      onPress: () => router.push('/planner' as any),
      disabled: !FEATURES.ENABLE_STUDY_PLANNER,
    },
    {
      icon: 'help-circle-outline' as const,
      title: 'Quick Quiz',
      subtitle: '10 questions',
      color: '#10B981',
      onPress: () => router.push('/quizzes'),
    },
    {
      icon: 'document-text-outline' as const,
      title: 'Mock Exams',
      subtitle: 'Exam mode',
      color: '#10B981',
      onPress: () => router.push('/mock-exams' as any),
      disabled: !FEATURES.ENABLE_MOCK_EXAMS,
    },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // AUTHENTICATED RENDER
  // ═══════════════════════════════════════════════════════════════════
  const renderAuthenticated = () => {
    if (loading) return <LoadingState text="Loading your study center..." />;

    const continueData = getContinueLearningData();
    const topRec = recommendations.length > 0 ? recommendations[0] : null;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ──────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              {streak > 0 && (
                <View style={styles.streakPill}>
                  <Ionicons name="flame" size={14} color="#F59E0B" />
                  <Text style={styles.streakText}>{streak} day streak</Text>
                </View>
              )}
            </View>
            <Text style={styles.gradeContext}>
              {user?.grade_level ? `Namibia • ${user.grade_level}` : 'Namibia • NSSCO'}
            </Text>
          </View>
        </View>

        {/* ─── Continue Learning Card ──────────────────────────────── */}
        <View style={styles.sectionPadded}>
          {continueData ? (
            <TouchableOpacity
              style={styles.continueLearningCard}
              onPress={continueData.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.continueLearningLabel}>CONTINUE LEARNING</Text>
              <Text style={styles.continueLearningTitle}>{continueData.title}</Text>
              <Text style={styles.continueLearningSubtitle}>{continueData.subtitle}</Text>
              <View style={styles.continueLearningProgress}>
                <View style={styles.continueLearningBarBg}>
                  <View
                    style={[
                      styles.continueLearningBarFill,
                      { width: `${continueData.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.continueLearningPercent}>
                  {continueData.progress}% mastered
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.continueLearningCard}
              onPress={() => router.push('/learn' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.continueLearningLabel}>GET STARTED</Text>
              <Text style={styles.continueLearningTitle}>Start learning</Text>
              <Text style={styles.continueLearningSubtitle}>
                Browse your subjects and start a topic
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Quick Access Grid ───────────────────────────────────── */}
        <View style={styles.sectionPadded}>
          <Text style={styles.sectionTitle}>Quick access</Text>
          <View style={styles.quickAccessGrid}>
            {quickAccessItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickAccessCard, item.disabled && styles.quickAccessDisabled]}
                onPress={item.disabled ? undefined : item.onPress}
                activeOpacity={item.disabled ? 1 : 0.7}
              >
                <View style={[styles.quickAccessIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.disabled ? COLORS.textMuted : item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quickAccessTitle, item.disabled && { color: COLORS.textMuted }]}>
                    {item.title}
                  </Text>
                  <Text style={styles.quickAccessSub}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Today's Goal ────────────────────────────────────────── */}
        <View style={styles.sectionPadded}>
          <Text style={styles.sectionTitle}>Today's goal</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalRow}>
              <Text style={styles.goalValue}>
                {subjectStats.length > 0
                  ? `${Math.round(subjectStats.reduce((a, s) => a + s.averageMastery, 0) / subjectStats.length)}%`
                  : '0%'}
              </Text>
              <Text style={styles.goalLabel}>overall mastery</Text>
            </View>
            <View style={styles.goalBarBg}>
              <View
                style={[
                  styles.goalBarFill,
                  {
                    width: `${subjectStats.length > 0 ? Math.round(subjectStats.reduce((a, s) => a + s.averageMastery, 0) / subjectStats.length) : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* ─── Recommendations ─────────────────────────────────────── */}
        {topRec && (
          <View style={styles.sectionPadded}>
            <Text style={styles.sectionTitle}>Because you're learning...</Text>
            <TouchableOpacity
              style={styles.recCard}
              activeOpacity={0.7}
              onPress={() => {
                if (topRec.type === 'topic_quiz' || topRec.type === 'continue') {
                  if (topRec.topicId) router.push(`/topic/${topRec.topicId}`);
                  else router.push({ pathname: '/quiz/[topic]', params: { topic: topRec.topicName || 'Unknown', gradeLevel: topRec.gradeLevel || user?.grade_level || 'NSSCO' } });
                } else if (topRec.type === 'review_topic') {
                  if (topRec.topicId) router.push(`/topic/${topRec.topicId}`);
                  else router.push('/quizzes');
                } else if (topRec.type === 'past_paper') {
                  router.push('/papers');
                } else if (topRec.type === 'flashcards') {
                  router.push('/flashcards');
                }
              }}
            >
              <Text style={styles.recText}>{topRec.reason || `Practice your weakest topics`}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Exam Countdown ──────────────────────────────────────── */}
        <View style={styles.sectionPadded}>
          <View style={styles.examCard}>
            <View style={styles.examLeft}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <View style={{ marginLeft: SPACING.sm }}>
                <Text style={styles.examLabel}>Exams in</Text>
                <Text style={styles.examDays}>{daysToExam} days</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/school' as any)}>
              <Text style={styles.examLink}>View timetable</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // UNAUTHENTICATED RENDER (preserved from original)
  // ═══════════════════════════════════════════════════════════════════
  const renderUnauthenticated = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.heroOverlay, { paddingTop: Math.max(insets.top, 16) + 16 }]}>
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Ionicons name="book" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.logoText}>NamStudy Prep</Text>
            </View>
            <TouchableOpacity style={styles.signInBtn} onPress={() => setAuthVisible(true)}>
              <Ionicons name="log-in" size={18} color={COLORS.white} />
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="star" size={12} color={COLORS.gold} />
              <Text style={styles.heroBadgeText}>Namibia's #1 Study Prep App</Text>
            </View>
            <Text style={styles.heroTitle}>Master NSSCO{'\n'}& NSSCAS Exams</Text>
            <Text style={styles.heroSubtitle}>
              Free past papers, step-by-step solutions, and topic quizzes to ace your subjects.
            </Text>

            <View style={styles.heroBtnRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/papers')} activeOpacity={0.8}>
                <Ionicons name="document-text" size={18} color={COLORS.primary} />
                <Text style={styles.primaryBtnText}>Browse Free Papers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/quizzes')} activeOpacity={0.8}>
                <Ionicons name="play" size={18} color={COLORS.white} />
                <Text style={styles.secondaryBtnText}>Start Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {[
            { icon: 'document-text', label: 'Past Papers', value: `${counts.papers}+`, color: COLORS.green },
            { icon: 'help-circle', label: 'Quiz Questions', value: `${counts.quizzes}+`, color: COLORS.accent },
            { icon: 'people', label: 'Students', value: `${counts.students}`, color: COLORS.primary },
            { icon: 'briefcase', label: 'Teachers', value: `${counts.teachers}`, color: COLORS.gold },
          ].map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon as any} size={18} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Features */}
      <View style={styles.sectionPadded}>
        <Text style={styles.sectionTitle}>Everything You Need</Text>
        {[
          { icon: 'albums', title: 'Revision Flashcards', desc: 'Active recall study cards tailored to your selected subjects.', color: COLORS.primary, bg: COLORS.primaryLight + '30', action: () => router.push('/flashcards') },
          { icon: 'document-text', title: 'Free Past Papers', desc: 'Access all NSSCO & NSSCAS past exam papers from 2019-2024 completely free.', color: COLORS.green, bg: COLORS.greenLight, action: () => router.push('/papers') },
          { 
            icon: 'chatbubbles', 
            title: 'NamTutor AI', 
            desc: 'Get 24/7 instant help with past papers, topics, and study tips.', 
            color: COLORS.gold, 
            bg: COLORS.goldLight, 
            action: () => { if (FEATURES.ENABLE_NAMTUTOR) router.push('/tutor'); }, 
            badge: FEATURES.ENABLE_NAMTUTOR ? 'NEW' : 'Coming Soon' 
          },
          { icon: 'key', title: 'Golden Memos', desc: 'Detailed step-by-step worked solutions to every exam paper. VIP only.', color: COLORS.gold, bg: COLORS.goldLight, action: () => router.push('/papers'), premium: true },
        ].map((feature, i) => (
          <TouchableOpacity key={i} style={styles.featureCard} onPress={feature.action} activeOpacity={0.7}>
            <View style={[styles.featureIcon, { backgroundColor: feature.bg }]}>
              <Ionicons name={feature.icon as any} size={24} color={feature.color} />
            </View>
            <View style={styles.featureContent}>
              <View style={styles.featureTitleRow}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                {feature.premium && <PremiumBadge />}
                {feature.badge && <View style={styles.newBadge}><Text style={styles.newBadgeText}>{feature.badge}</Text></View>}
              </View>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <View style={styles.ctaIcon}>
          <Ionicons name="rocket" size={32} color={COLORS.white} />
        </View>
        <Text style={styles.ctaTitle}>Ready to Ace Your Exams?</Text>
        <Text style={styles.ctaSubtitle}>Start with free past papers or upgrade to VIP for complete solutions and unlimited quizzes.</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => setAuthVisible(true)} activeOpacity={0.8}>
          <Text style={styles.ctaBtnText}>Get Started Free</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {user ? renderAuthenticated() : renderUnauthenticated()}
      <SubjectSelectionModal 
        visible={subjectModalVisible}
        onClose={() => setSubjectModalVisible(false)}
        onEnrollSuccess={() => {
          setSubjectModalVisible(false);
          fetchAuthenticatedData();
        }}
      />
      <AuthModal 
        visible={authVisible} 
        onClose={() => setAuthVisible(false)} 
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ─── Authenticated Header ──────────────────────────────────────────
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  streakText: {
    ...FONTS.small,
    color: '#92400E',
    fontWeight: '600',
  },
  gradeContext: {
    ...FONTS.body,
    color: COLORS.textMuted,
  },

  // ─── Section Padding ──────────────────────────────────────────────
  sectionPadded: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  // ─── Continue Learning ────────────────────────────────────────────
  continueLearningCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  continueLearningLabel: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  continueLearningTitle: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  continueLearningSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  continueLearningProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  continueLearningBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
  },
  continueLearningBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  continueLearningPercent: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // ─── Quick Access Grid ────────────────────────────────────────────
  quickAccessGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickAccessCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  quickAccessDisabled: {
    opacity: 0.5,
  },
  quickAccessIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  quickAccessSub: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontSize: 11,
  },

  // ─── Today's Goal ─────────────────────────────────────────────────
  goalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  goalValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  goalLabel: {
    ...FONTS.body,
    color: COLORS.textMuted,
  },
  goalBarBg: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },

  // ─── Recommendation Card ──────────────────────────────────────────
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  recText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
  },

  // ─── Exam Countdown ───────────────────────────────────────────────
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  examLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  examLabel: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  examDays: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
  },
  examLink: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
    fontSize: 13,
  },

  // ─── Unauth Hero ──────────────────────────────────────────────────
  hero: { backgroundColor: COLORS.primary, minHeight: 420 },
  heroOverlay: { flex: 1, backgroundColor: 'rgba(88, 28, 135, 0.85)', paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xxxl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: COLORS.white, letterSpacing: -0.3 },
  signInBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  signInText: { ...FONTS.caption, color: COLORS.white, fontWeight: '600' },
  heroContent: { flex: 1, justifyContent: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, marginBottom: SPACING.lg },
  heroBadgeText: { ...FONTS.small, color: COLORS.goldLight, fontWeight: '600' },
  heroTitle: { fontSize: 36, fontWeight: '900', color: COLORS.white, lineHeight: 42, letterSpacing: -1, marginBottom: SPACING.md },
  heroSubtitle: { ...FONTS.body, color: 'rgba(255,255,255,0.8)', lineHeight: 22, marginBottom: SPACING.xxl },
  heroBtnRow: { flexDirection: 'row', gap: SPACING.md },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.white, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md, ...SHADOWS.lg },
  primaryBtnText: { ...FONTS.bodyBold, color: COLORS.primary },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  secondaryBtnText: { ...FONTS.bodyBold, color: COLORS.white },

  // ─── Unauth Stats ─────────────────────────────────────────────────
  statsContainer: { marginTop: -20, paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  statValue: { ...FONTS.h3, color: COLORS.textPrimary },
  statLabel: { ...FONTS.small, color: COLORS.textMuted },

  // ─── Unauth Features ──────────────────────────────────────────────
  featureCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  featureIcon: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  featureContent: { flex: 1, marginRight: SPACING.sm },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  featureTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  featureDesc: { ...FONTS.small, color: COLORS.textSecondary, lineHeight: 16 },
  newBadge: { backgroundColor: COLORS.red, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.white },

  // ─── Unauth CTA ───────────────────────────────────────────────────
  ctaSection: { marginHorizontal: SPACING.xl, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xxl, alignItems: 'center', marginBottom: SPACING.xxxl, ...SHADOWS.xl },
  ctaIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  ctaTitle: { ...FONTS.h2, color: COLORS.white, textAlign: 'center', marginBottom: SPACING.sm },
  ctaSubtitle: { ...FONTS.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.white, paddingHorizontal: SPACING.xxl, paddingVertical: 14, borderRadius: RADIUS.md },
  ctaBtnText: { ...FONTS.bodyBold, color: COLORS.primary },
});
