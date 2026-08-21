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
import ScreenHeader from '@/components/ui/ScreenHeader';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import ProgressBar from '@/components/ui/ProgressBar';
import GradientCard from '@/components/ui/GradientCard';
import PremiumBadge from '@/components/ui/PremiumBadge';
import AuthModal from '@/components/AuthModal';

interface QuizAttempt {
  id: string;
  topic_name: string;
  score: number;
  total_questions: number;
  subject?: string;
  created_at: string;
  grade_level?: string;
}

interface SubjectStat {
  subject: string;
  percentage: number;
  attempts: number;
}

export default function HomeScreen() {
  const { user, isPro, streak } = useUser();
  const router = useRouter();
  
  const [authVisible, setAuthVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Stats (Unauthenticated)
  const [counts, setCounts] = useState({ papers: 0, quizzes: 0, students: 0, teachers: 0 });

  // Personalized Data (Authenticated)
  const [recentAttempt, setRecentAttempt] = useState<QuizAttempt | null>(null);
  const [weakTopics, setWeakTopics] = useState<QuizAttempt[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);

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
      const [attemptsRes, resultsRes] = await Promise.all([
        supabase.from('quiz_attempts').select('*').eq('user_id', user?.id),
        supabase.from('quiz_results').select('*').eq('user_id', user?.id)
      ]);

      const combinedData = [
        ...(attemptsRes.data || []),
        ...(resultsRes.data || []),
      ] as QuizAttempt[];

      combinedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (combinedData.length > 0) {
        setRecentAttempt(combinedData[0]);

        // Process Subject Stats
        const aggregated: Record<string, { score: number; possible: number; attempts: number }> = {};
        const topicScores: Record<string, { score: number; possible: number; latest: QuizAttempt }> = {};

        combinedData.forEach((item) => {
          const sub = item.subject || 'Mathematics';
          if (!aggregated[sub]) aggregated[sub] = { score: 0, possible: 0, attempts: 0 };
          aggregated[sub].score += item.score;
          aggregated[sub].possible += item.total_questions;
          aggregated[sub].attempts += 1;

          if (!topicScores[item.topic_name]) {
            topicScores[item.topic_name] = { score: 0, possible: 0, latest: item };
          }
          topicScores[item.topic_name].score += item.score;
          topicScores[item.topic_name].possible += item.total_questions;
        });

        const statsArray = Object.keys(aggregated).map((subject) => ({
          subject,
          percentage: Math.round((aggregated[subject].score / aggregated[subject].possible) * 100),
          attempts: aggregated[subject].attempts,
        })).sort((a, b) => b.percentage - a.percentage);
        setSubjectStats(statsArray);

        // Find weak topics (less than 70% average)
        const weak = Object.values(topicScores)
          .map(t => ({
            ...t.latest,
            avgPercentage: (t.score / t.possible) * 100
          }))
          .filter(t => t.avgPercentage < 70)
          .sort((a, b) => a.avgPercentage - b.avgPercentage)
          .slice(0, 3);
        setWeakTopics(weak);
      } else {
        setRecentAttempt(null);
        setSubjectStats([]);
        setWeakTopics([]);
      }
    } catch (err) {}
    setLoading(false);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return COLORS.green;
    if (percentage >= 50) return COLORS.gold;
    return COLORS.red;
  };

  const renderAuthenticated = () => {
    if (loading) return <LoadingState text="Loading your study center..." />;

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader 
          title={`Hello, ${user?.name?.split(' ')[0] || 'Student'}`} 
          subtitle="Ready to study?"
          rightComponent={
             <TouchableOpacity onPress={() => router.push('/profile')}>
               {user?.avatar_url ? (
                 <Image source={{ uri: user.avatar_url }} style={styles.headerAvatar} />
               ) : (
                 <Ionicons name="person-circle" size={32} color={COLORS.white} />
               )}
             </TouchableOpacity>
          }
        />

        {/* Streak & Countdown Widget */}
        <View style={styles.authWidgetContainer}>
          <View style={styles.authWidgetCard}>
            <View style={styles.authWidgetItem}>
              <View style={[styles.authWidgetIconBg, { backgroundColor: COLORS.goldLight }]}>
                <Ionicons name="flame" size={24} color={COLORS.goldDark} />
              </View>
              <View>
                <Text style={styles.authWidgetValue}>{streak} {streak === 1 ? 'Day' : 'Days'}</Text>
                <Text style={styles.authWidgetLabel}>Study Streak</Text>
              </View>
            </View>
            <View style={styles.authWidgetDivider} />
            <View style={styles.authWidgetItem}>
              <View style={[styles.authWidgetIconBg, { backgroundColor: COLORS.primaryLight + '30' }]}>
                <Ionicons name="calendar" size={24} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.authWidgetValue}>{daysToExam} Days</Text>
                <Text style={styles.authWidgetLabel}>Until Exams</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Continue Studying" />
          {recentAttempt ? (
            <GradientCard gradient={GRADIENTS.primary} onPress={() => router.push({ pathname: '/quiz/[topic]', params: { topic: recentAttempt.topic_name, gradeLevel: recentAttempt.grade_level || 'NSSCO' } } as any)}>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <View style={{ flex: 1 }}>
                   <Text style={{ ...FONTS.caption, color: COLORS.white, opacity: 0.8 }}>Latest Activity</Text>
                   <Text style={{ ...FONTS.h3, color: COLORS.white, marginVertical: 4 }}>{recentAttempt.topic_name}</Text>
                   <Text style={{ ...FONTS.small, color: COLORS.white, opacity: 0.8 }}>Score: {recentAttempt.score}/{recentAttempt.total_questions}</Text>
                 </View>
                 <Ionicons name="play-circle" size={40} color={COLORS.white} />
               </View>
            </GradientCard>
          ) : (
            <EmptyState 
              icon="rocket-outline"
              title="Let's get started!" 
              description="You haven't completed any quizzes yet. Take your first quiz to kickstart your progress."
              actionText="Start a Quiz"
              onAction={() => router.push('/quizzes')}
              style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.lg, ...SHADOWS.sm }}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recommended for You" subtitle="Focus on areas that need improvement" />
          {weakTopics.length > 0 ? (
            weakTopics.map((topic, i) => (
              <TouchableOpacity key={i} style={styles.recommendedCard} onPress={() => router.push({ pathname: '/quiz/[topic]', params: { topic: topic.topic_name, gradeLevel: topic.grade_level || 'NSSCO' } } as any)}>
                <View style={styles.recommendedIcon}>
                  <Ionicons name="trending-up" size={20} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recommendedTitle}>{topic.topic_name}</Text>
                  <Text style={styles.recommendedSub}>Needs Review</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))
          ) : recentAttempt ? (
            <EmptyState 
              icon="trophy-outline"
              title="You're crushing it!" 
              description="No weak topics identified yet. Keep up the good work."
              style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.lg, ...SHADOWS.sm }}
            />
          ) : (
             <EmptyState 
              icon="analytics-outline"
              title="No recommendations yet" 
              description="Complete quizzes to get personalized recommendations."
              style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.lg, ...SHADOWS.sm }}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Your Progress" actionText="View All" onAction={() => router.push('/analytics')} />
          {subjectStats.length > 0 ? (
            <View style={styles.progressCard}>
               {subjectStats.slice(0, 3).map((stat, i) => (
                 <View key={stat.subject} style={[styles.progressItem, i !== Math.min(2, subjectStats.length - 1) && styles.progressItemBorder]}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressSubject}>{stat.subject}</Text>
                      <Text style={[styles.progressPercentage, { color: getProgressColor(stat.percentage) }]}>{stat.percentage}%</Text>
                    </View>
                    <ProgressBar progress={stat.percentage / 100} color={getProgressColor(stat.percentage)} />
                 </View>
               ))}
            </View>
          ) : (
            <EmptyState 
              title="Track your mastery" 
              description="Subject progress will appear here once you take quizzes."
              style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.lg, ...SHADOWS.sm }}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Quick Study Tools" />
          <View style={styles.toolsGrid}>
             <ToolCard icon="document-text" title="Papers" color={COLORS.green} onPress={() => router.push('/papers')} />
             <ToolCard icon="help-circle" title="Quizzes" color={COLORS.accent} onPress={() => router.push('/quizzes')} />
             <ToolCard icon="albums" title="Flashcards" color={COLORS.primary} onPress={() => router.push('/flashcards')} />
             <ToolCard icon="chatbubbles" title="NamTutor" color={COLORS.gold} onPress={() => router.push('/tutor')} badge="NEW" />
             <ToolCard icon="bookmark" title="Saved" color={COLORS.red} onPress={() => router.push('/bookmarks')} />
             <ToolCard icon="stats-chart" title="Progress" color={COLORS.primaryDark} onPress={() => router.push('/analytics')} />
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderUnauthenticated = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Existing Marketing Hero (Polished) */}
      <View style={styles.hero}>
        <View style={styles.heroOverlay}>
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

      <View style={styles.widgetContainer}>
        <View style={styles.widgetCard}>
          <View style={styles.widgetItem}>
            <View style={[styles.widgetIconBg, { backgroundColor: COLORS.gold + '20' }]}>
              <Ionicons name="flame" size={24} color={COLORS.gold} />
            </View>
            <View>
              <Text style={styles.widgetValue}>0 Days</Text>
              <Text style={styles.widgetLabel}>Study Streak</Text>
            </View>
          </View>
          <View style={styles.widgetDivider} />
          <View style={styles.widgetItem}>
            <View style={[styles.widgetIconBg, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="calendar" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.widgetValue}>{daysToExam} Days</Text>
              <Text style={styles.widgetLabel}>Until Exams</Text>
            </View>
          </View>
        </View>
      </View>

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

      <View style={styles.section}>
        <SectionHeader title="Everything You Need" subtitle="All the tools to prepare for your exams" />
        {[
          { icon: 'albums', title: 'Revision Flashcards', desc: 'Active recall study cards tailored to your selected subjects.', color: COLORS.primary, bg: COLORS.primaryLight + '30', action: () => router.push('/flashcards') },
          { icon: 'document-text', title: 'Free Past Papers', desc: 'Access all NSSCO & NSSCAS past exam papers from 2019-2024 completely free.', color: COLORS.green, bg: COLORS.greenLight, action: () => router.push('/papers') },
          { icon: 'chatbubbles', title: 'NamTutor AI', desc: 'Get 24/7 instant help with past papers, topics, and study tips.', color: COLORS.gold, bg: COLORS.goldLight, action: () => router.push('/tutor'), badge: 'NEW' },
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
      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    </View>
  );
}

const ToolCard = ({ icon, title, color, onPress, badge }: any) => (
  <TouchableOpacity style={styles.toolCard} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.toolIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={24} color={color} />
      {badge && (
         <View style={styles.toolBadge}>
           <Text style={styles.toolBadgeText}>{badge}</Text>
         </View>
      )}
    </View>
    <Text style={styles.toolText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COLORS.white },
  section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xxxl },
  
  // Auth Widgets
  authWidgetContainer: { paddingHorizontal: SPACING.xl, marginTop: -SPACING.md, marginBottom: SPACING.xxl, zIndex: 10 },
  authWidgetCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.md, alignItems: 'center' },
  authWidgetItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  authWidgetIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  authWidgetValue: { ...FONTS.h3, color: COLORS.textPrimary },
  authWidgetLabel: { ...FONTS.small, color: COLORS.textMuted },
  authWidgetDivider: { width: 1, height: 40, backgroundColor: COLORS.borderLight },
  
  // Recommendations
  recommendedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  recommendedIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.accentLight + '30', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  recommendedTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: 2 },
  recommendedSub: { ...FONTS.small, color: COLORS.textMuted },
  
  // Progress
  progressCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  progressItem: { paddingVertical: SPACING.md },
  progressItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  progressSubject: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  progressPercentage: { ...FONTS.bodyBold },
  
  // Tools Grid
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, justifyContent: 'space-between' },
  toolCard: { width: '31%', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.sm, alignItems: 'center', ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  toolIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  toolText: { ...FONTS.caption, color: COLORS.textPrimary, textAlign: 'center' },
  toolBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.red, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  toolBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.white },
  
  // Unauth Hero
  hero: { backgroundColor: COLORS.primary, minHeight: 420 },
  heroOverlay: { flex: 1, backgroundColor: 'rgba(88, 28, 135, 0.85)', paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },
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
  
  // Unauth Widget
  widgetContainer: { paddingHorizontal: SPACING.xl, marginTop: -SPACING.xl, marginBottom: SPACING.lg, zIndex: 10 },
  widgetCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.md, alignItems: 'center' },
  widgetItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  widgetIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  widgetValue: { ...FONTS.h3, color: COLORS.textPrimary },
  widgetLabel: { ...FONTS.small, color: COLORS.textMuted },
  widgetDivider: { width: 1, height: 40, backgroundColor: COLORS.borderLight },
  
  // Unauth Stats
  statsContainer: { marginTop: -20, paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  statValue: { ...FONTS.h3, color: COLORS.textPrimary },
  statLabel: { ...FONTS.small, color: COLORS.textMuted },
  
  // Unauth Features
  featureCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  featureIcon: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  featureContent: { flex: 1, marginRight: SPACING.sm },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  featureTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  featureDesc: { ...FONTS.small, color: COLORS.textSecondary, lineHeight: 16 },
  newBadge: { backgroundColor: COLORS.red, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.white },
  
  // Unauth CTA
  ctaSection: { marginHorizontal: SPACING.xl, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.xxl, alignItems: 'center', marginBottom: SPACING.xxxl, ...SHADOWS.xl },
  ctaIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  ctaTitle: { ...FONTS.h2, color: COLORS.white, textAlign: 'center', marginBottom: SPACING.sm },
  ctaSubtitle: { ...FONTS.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.white, paddingHorizontal: SPACING.xxl, paddingVertical: 14, borderRadius: RADIUS.md },
  ctaBtnText: { ...FONTS.bodyBold, color: COLORS.primary },
});
