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
import { getCacheData, setCacheData } from '@/lib/cache';
import TopicCard from '@/components/TopicCard';
import UpgradeModal from '@/components/UpgradeModal';
import AuthModal from '@/components/AuthModal';

interface TopicSummary {
  topicName: string;
  questionCount: number;
  gradeLevel: string;
  subject: string;
}

export default function QuizzesScreen() {
  const { user, isVIP, toggleBookmark, isBookmarked } = useUser();
  const router = useRouter();
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<'All' | 'NSSCO' | 'NSSCAS'>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [freeAttempts, setFreeAttempts] = useState<Record<string, number>>({});
  const [isOfflineError, setIsOfflineError] = useState(false);

  useEffect(() => {
    fetchTopics();
  }, [user]);

  const fetchTopics = async () => {
    const cachedTopics = await getCacheData('quizzes_list');
    if (cachedTopics && cachedTopics.length > 0) {
      setTopics(cachedTopics);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from('quizzes')
        .select('topic_name, grade_level, subject');

      const userIsAdmin = user?.role === 'admin' || (user as any)?.is_admin === true;

      if (user && !userIsAdmin && user.subjects && user.subjects.length > 0) {
        query = query.in('subject', user.subjects);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching topics:', error.message);
        if (!cachedTopics || cachedTopics.length === 0) setIsOfflineError(true);
      } else if (data) {
        const topicMap: Record<string, TopicSummary> = {};
        data.forEach((q: any) => {
          const sub = q.subject || 'Mathematics';
          const key = `${q.topic_name}-${q.grade_level}-${sub}`;
          if (!topicMap[key]) {
            topicMap[key] = {
              topicName: q.topic_name,
              questionCount: 0,
              gradeLevel: q.grade_level,
              subject: sub,
            };
          }
          topicMap[key].questionCount++;
        });
        const topicsArr = Object.values(topicMap);
        setTopics(topicsArr);
        await setCacheData('quizzes_list', topicsArr);
        setIsOfflineError(false);
      }
    } catch (err) {
      console.error('Fetch topics exception:', err);
      if (!cachedTopics || cachedTopics.length === 0) setIsOfflineError(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = topics.filter(t => {
    if (subjectFilter !== 'All' && t.subject !== subjectFilter) return false;
    if (gradeFilter !== 'All' && t.gradeLevel !== gradeFilter) return false;
    return true;
  });

  const availableSubjects = user?.subjects && user.subjects.length > 0
    ? user.subjects
    : [...new Set(topics.map(t => t.subject))].filter(Boolean);

  const handleTopicPress = (topic: TopicSummary) => {
    if (!user) {
      setAuthVisible(true);
      return;
    }

    const key = `${topic.topicName}-${topic.gradeLevel}-${topic.subject}`;
    const attemptsLeft = freeAttempts[key] ?? 3;

    if (!isVIP && attemptsLeft <= 0) {
      setUpgradeVisible(true);
      return;
    }

    if (!isVIP) {
      setFreeAttempts(prev => ({
        ...prev,
        [key]: (prev[key] ?? 3) - 1,
      }));
    }

    router.push({
      pathname: '/quiz/[topic]',
      params: { 
        topic: topic.topicName, 
        gradeLevel: topic.gradeLevel,
        subject: topic.subject
      },
    });
  };

  const handleToggleBookmark = async (topic: TopicSummary) => {
    if (!user) {
      setAuthVisible(true);
      return;
    }
    const key = `${topic.topicName}-${topic.gradeLevel}-${topic.subject}`;
    await toggleBookmark(key, 'quiz', topic.topicName, topic);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Topic Quizzes</Text>
        <Text style={styles.headerSubtitle}>
          Test your knowledge across all topics
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {availableSubjects.length > 1 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterChip, subjectFilter === 'All' && styles.filterChipActive]}
                onPress={() => setSubjectFilter('All')}
              >
                <Text style={[styles.filterChipText, subjectFilter === 'All' && styles.filterChipTextActive]}>
                  All Subjects
                </Text>
              </TouchableOpacity>
              {availableSubjects.map(sub => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.filterChip, subjectFilter === sub && styles.filterChipActive]}
                  onPress={() => setSubjectFilter(subjectFilter === sub ? 'All' : sub)}
                >
                  <Text style={[styles.filterChipText, subjectFilter === sub && styles.filterChipTextActive]}>
                    {sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.filterContainer}>
          {(['All', 'NSSCO', 'NSSCAS'] as const).map(grade => (
            <TouchableOpacity
              key={grade}
              style={[styles.filterTab, gradeFilter === grade && styles.filterTabActive]}
              onPress={() => setGradeFilter(grade)}
            >
              <Text style={[styles.filterTabText, gradeFilter === grade && styles.filterTabTextActive]}>
                {grade === 'All' ? 'All Grades' : grade}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isVIP && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={COLORS.accent} />
            <View style={styles.infoBannerContent}>
              <Text style={styles.infoBannerTitle}>Free users: 3 attempts per topic</Text>
              <Text style={styles.infoBannerText}>Upgrade to VIP for unlimited quizzes</Text>
            </View>
            <TouchableOpacity 
              style={styles.infoBannerBtn}
              onPress={() => setUpgradeVisible(true)}
            >
              <Text style={styles.infoBannerBtnText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        )}

        {isVIP && (
          <View style={styles.vipBanner}>
            <Ionicons name="diamond" size={20} color={COLORS.gold} />
            <Text style={styles.vipBannerText}>VIP Active - Unlimited Quizzes</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading topics...</Text>
          </View>
        ) : filteredTopics.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={isOfflineError ? "cloud-offline-outline" : "help-circle-outline"} 
              size={48} 
              color={COLORS.textMuted} 
            />
            <Text style={styles.emptyTitle}>
              {isOfflineError ? "Offline Mode" : "No Quizzes Found"}
            </Text>
            <Text style={styles.emptyText}>
              {isOfflineError 
                ? "Connect to the internet to download your first study materials." 
                : "Try adjusting your filters"}
            </Text>
          </View>
        ) : (
          <View style={styles.topicsGrid}>
            {filteredTopics.map((topic) => {
              const key = `${topic.topicName}-${topic.gradeLevel}-${topic.subject}`;
              return (
                <TopicCard
                  key={key}
                  topicName={topic.topicName}
                  questionCount={topic.questionCount}
                  gradeLevel={topic.gradeLevel}
                  isVIP={isVIP}
                  freeAttemptsLeft={freeAttempts[key] ?? 3}
                  isBookmarked={isBookmarked(key)}
                  onPress={() => handleTopicPress(topic)}
                  onToggleBookmark={() => handleToggleBookmark(topic)}
                />
              );
            })}
          </View>
        )}

        {/* How It Works Section Restored */}
        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How Quizzes Work</Text>
          <View style={styles.howStep}>
            <View style={[styles.howStepNum, { backgroundColor: COLORS.primary + '15' }]}>
              <Text style={[styles.howStepNumText, { color: COLORS.primary }]}>1</Text>
            </View>
            <View style={styles.howStepContent}>
              <Text style={styles.howStepTitle}>Choose a Topic</Text>
              <Text style={styles.howStepText}>Select from Algebra, Mechanics, Chemistry and more</Text>
            </View>
          </View>
          <View style={styles.howStep}>
            <View style={[styles.howStepNum, { backgroundColor: COLORS.accent + '15' }]}>
              <Text style={[styles.howStepNumText, { color: COLORS.accent }]}>2</Text>
            </View>
            <View style={styles.howStepContent}>
              <Text style={styles.howStepTitle}>Answer Questions</Text>
              <Text style={styles.howStepText}>Multiple choice questions with instant feedback</Text>
            </View>
          </View>
          <View style={styles.howStep}>
            <View style={[styles.howStepNum, { backgroundColor: COLORS.green + '15' }]}>
              <Text style={[styles.howStepNumText, { color: COLORS.green }]}>3</Text>
            </View>
            <View style={styles.howStepContent}>
              <Text style={styles.howStepTitle}>Learn from Explanations</Text>
              <Text style={styles.howStepText}>Detailed explanations for every answer</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  headerTitle: { ...FONTS.h1, color: COLORS.white, marginBottom: 2 },
  headerSubtitle: { ...FONTS.caption, color: 'rgba(255,255,255,0.7)' },
  scrollView: { flex: 1 },
  filterSection: { paddingTop: SPACING.lg, paddingLeft: SPACING.xl },
  filterLabel: { ...FONTS.caption, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  filterScroll: { flexGrow: 0 },
  filterChip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.white, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { ...FONTS.caption, color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white, fontWeight: '700' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, gap: SPACING.sm },
  filterTab: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.sm, backgroundColor: COLORS.white, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTabText: { ...FONTS.caption, color: COLORS.textSecondary },
  filterTabTextActive: { color: COLORS.white, fontWeight: '700' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', marginHorizontal: SPACING.xl, marginTop: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.sm },
  infoBannerContent: { flex: 1 },
  infoBannerTitle: { ...FONTS.caption, color: COLORS.accent, fontWeight: '700' },
  infoBannerText: { ...FONTS.small, color: COLORS.accent },
  infoBannerBtn: { backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.sm },
  infoBannerBtnText: { ...FONTS.small, color: COLORS.white, fontWeight: '700' },
  vipBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.goldLight, marginHorizontal: SPACING.xl, marginTop: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.gold + '30' },
  vipBannerText: { ...FONTS.caption, color: COLORS.goldDark, fontWeight: '700' },
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.md },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.xs, textAlign: 'center', paddingHorizontal: 20 },
  howItWorks: { marginHorizontal: SPACING.xl, marginTop: SPACING.xxxl, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, ...SHADOWS.sm },
  howTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: SPACING.lg },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.lg },
  howStepNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  howStepNumText: { ...FONTS.bodyBold, fontWeight: '800' },
  howStepContent: { flex: 1 },
  howStepTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: 2 },
  howStepText: { ...FONTS.small, color: COLORS.textSecondary },
});