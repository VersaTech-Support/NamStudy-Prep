import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '@/constants/theme';
import { FEATURES } from '@/constants/features';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import ScreenHeader from '@/components/ui/ScreenHeader';
import SectionHeader from '@/components/ui/SectionHeader';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import GradientCard from '@/components/ui/GradientCard';
import ProgressBar from '@/components/ui/ProgressBar';
import RecommendationCard from '@/components/ui/RecommendationCard';

import { getUserMastery } from '@/lib/learning/mastery';
import { getNextBestActions } from '@/lib/learning/recommendations';
import { getTopicContentProgress } from '@/lib/learning/contentProgress';
import { TopicMastery, StudyRecommendation } from '@/lib/learning/types';

interface Topic {
  id: string;
  name: string;
  description: string | null;
  subject_id: string;
}

interface CurriculumSubject {
  id: string;
  name: string;
  grade_id: string;
}

interface Grade {
  id: string;
  name: string;
  curriculum_id: string;
}

interface Curriculum {
  id: string;
  name: string;
}

export default function TopicHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<CurriculumSubject | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [topicMastery, setTopicMastery] = useState<TopicMastery | null>(null);
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [contentProgressPercent, setContentProgressPercent] = useState(0);

  useEffect(() => {
    fetchTopicData();
  }, [id]);

  const fetchTopicData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Topic
      const { data: tData, error: tErr } = await supabase
        .from('topics')
        .select('*')
        .eq('id', id)
        .single();
      
      if (tData) {
        setTopic(tData);
        
        // 2. Fetch Curriculum Subject
        const { data: sData } = await supabase
          .from('curriculum_subjects')
          .select('*')
          .eq('id', tData.subject_id)
          .single();
          
        if (sData) {
          setSubject(sData);
          
          // 3. Fetch Grade
          const { data: gData } = await supabase
            .from('grades')
            .select('*')
            .eq('id', sData.grade_id)
            .single();
            
          if (gData) {
            setGrade(gData);
            
            // 4. Fetch Curriculum
            const { data: cData } = await supabase
              .from('curricula')
              .select('*')
              .eq('id', gData.curriculum_id)
              .single();
            if (cData) setCurriculum(cData);
          }
        }
      }

      // 5. Fetch Counts
      const { count: fCount } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', id);
      setFlashcardCount(fCount || 0);

      const { count: qCount } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', id);
      setQuizCount(qCount || 0);

      // 6. Calculate Mastery using central intelligence service
      if (tData && user) {
        // Content progress
        const cp = await getTopicContentProgress(user.id, id);
        setContentProgressPercent(cp.progressPercent);

        const masteryData = await getUserMastery(user.id);
        const thisTopicMastery = masteryData.topicMastery.find(t => t.topic_id === id);
        if (thisTopicMastery) {
          setTopicMastery(thisTopicMastery);
        }

        // Calculate next best action specifically contexted for this topic (if any)
        const nextActions = getNextBestActions({
          topicMastery: thisTopicMastery ? [thisTopicMastery] : [], 
          subjectMastery: masteryData.subjectMastery,
          userSubjects: user.subjects || ['Mathematics'],
          isPro: true, // simplified for context
        });

        if (nextActions.length > 0) {
          setRecommendation(nextActions[0]);
        }
      }

    } catch (err) {
      console.error("Error fetching topic:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState text="Loading Topic Hub..." />;
  }

  if (!topic || !subject) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <ScreenHeader title="Topic Not Found" showBack />
        <EmptyState 
          icon="document-text-outline"
          title="Topic Unavailable"
          description="We couldn't find the requested topic. It may have been moved or deleted."
          actionText="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title={topic.name} 
        subtitle={`${curriculum?.name || ''} • ${grade?.name || ''} • ${subject.name}`}
        showBack 
      />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Overview & Progress */}
        <View style={styles.masteryContainer}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          
          {/* Content Completion */}
          <View style={styles.progressRow}>
            <View style={styles.progressIcon}>
              <Ionicons name="document-text" size={16} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ ...FONTS.small, color: COLORS.textSecondary }}>Notes</Text>
                <Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary }}>{contentProgressPercent}%</Text>
              </View>
              <ProgressBar progress={contentProgressPercent / 100} height={6} color={COLORS.primary} />
            </View>
          </View>

          {/* Quiz Mastery */}
          <View style={[styles.progressRow, { marginTop: SPACING.md }]}>
            <View style={[styles.progressIcon, { backgroundColor: COLORS.greenLight }]}>
              <Ionicons name="school" size={16} color={COLORS.green} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ ...FONTS.small, color: COLORS.textSecondary }}>Mastery</Text>
                <Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary }}>
                  {topicMastery ? `${topicMastery.masteryScore}%` : '—'}
                </Text>
              </View>
              <ProgressBar 
                progress={topicMastery ? topicMastery.masteryScore / 100 : 0} 
                height={6} 
                color={topicMastery 
                  ? (topicMastery.masteryScore >= 70 ? COLORS.green : topicMastery.masteryScore >= 50 ? COLORS.gold : COLORS.red)
                  : COLORS.borderLight
                } 
              />
              {topicMastery && (
                <Text style={{ ...FONTS.small, color: COLORS.textMuted, marginTop: 4 }}>
                  {topicMastery.attempts} attempt{topicMastery.attempts !== 1 ? 's' : ''}
                  {topicMastery.trend !== 'INSUFFICIENT_DATA' && ` • ${topicMastery.trend.toLowerCase()}`}
                </Text>
              )}
              {!topicMastery && (
                <Text style={{ ...FONTS.small, color: COLORS.textMuted, marginTop: 4 }}>
                  Take a quiz to build mastery
                </Text>
              )}
            </View>
          </View>
        </View>

        {topic.description ? (
          <Text style={styles.description}>{topic.description}</Text>
        ) : null}

        {/* Recommended Next Action */}
        {recommendation && (
          <View style={{ marginBottom: SPACING.lg }}>
            <SectionHeader title="Recommended Next" />
            <RecommendationCard 
              recommendation={recommendation}
              onPress={() => {
                if (recommendation.type === 'topic_quiz' || recommendation.type === 'continue') {
                  router.push(`/quiz/${encodeURIComponent(topic.name)}?topic_id=${topic.id}&subject=${encodeURIComponent(subject.name)}`);
                } else if (recommendation.type === 'flashcards') {
                  router.push(`/flashcards?topic_id=${topic.id}&topic_name=${encodeURIComponent(topic.name)}`);
                } else if (recommendation.type === 'past_paper') {
                  router.push(`/papers?subject=${encodeURIComponent(subject.name)}`);
                } else if (recommendation.type === 'review_topic') {
                  // Already here
                }
              }}
            />
          </View>
        )}

        {/* Study Actions */}
        <SectionHeader title="Study Tools" />
        <View style={styles.actionGrid}>
          
          <TouchableOpacity 
            style={[styles.actionCard, { width: '100%', marginBottom: SPACING.md, flexDirection: 'row', alignItems: 'center' }]} 
            onPress={() => router.push(`/topic/${topic.id}/notes`)}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.primaryLight, marginRight: SPACING.md }]}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Revision Notes</Text>
              <Text style={styles.actionSubtitle}>Read comprehensive study notes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push(`/flashcards?topic_id=${topic.id}&topic_name=${encodeURIComponent(topic.name)}`)}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.goldLight }]}>
              <Ionicons name="albums-outline" size={24} color={COLORS.gold} />
            </View>
            <Text style={styles.actionTitle}>Flashcards</Text>
            <Text style={styles.actionSubtitle}>{flashcardCount} cards</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push(`/quiz/${encodeURIComponent(topic.name)}?topic_id=${topic.id}&subject=${encodeURIComponent(subject.name)}`)}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.greenLight }]}>
              <Ionicons name="help-circle-outline" size={24} color={COLORS.green} />
            </View>
            <Text style={styles.actionTitle}>Quiz</Text>
            <Text style={styles.actionSubtitle}>{quizCount} questions</Text>
          </TouchableOpacity>
        </View>

        {/* AI Tutor Entry */}
        <SectionHeader title="Stuck?" />
        <GradientCard
          onPress={() => {
            if (FEATURES.ENABLE_NAMTUTOR) {
              router.push({
                pathname: '/tutor',
                params: {
                  topicId: topic.id,
                  topicName: topic.name,
                  subject: subject.name,
                  grade: grade?.name,
                  curriculum: curriculum?.name
                }
              });
            }
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ ...FONTS.h3, color: COLORS.white }}>Ask NamTutor</Text>
                {!FEATURES.ENABLE_NAMTUTOR && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ ...FONTS.caption, color: COLORS.white, fontWeight: '600' }}>Coming Soon</Text>
                  </View>
                )}
              </View>
              <Text style={{ ...FONTS.body, color: COLORS.white, opacity: 0.9 }}>
                {FEATURES.ENABLE_NAMTUTOR ? `Get instant AI help with ${topic.name}` : 'AI tutoring is temporarily offline.'}
              </Text>
            </View>
            <Ionicons name="sparkles" size={32} color={FEATURES.ENABLE_NAMTUTOR ? COLORS.white : 'rgba(255,255,255,0.5)'} />
          </View>
        </GradientCard>

        <View style={{ marginTop: SPACING.xl }}>
          <SectionHeader 
            title="Past Papers" 
            subtitle="Relevant to this subject"
            actionText="View All"
            onAction={() => router.push(`/papers?subject=${encodeURIComponent(subject.name)}`)}
          />
        </View>
        <View style={styles.paperPlaceholder}>
          <Ionicons name="document-text-outline" size={24} color={COLORS.textMuted} />
          <Text style={styles.placeholderText}>
            Papers for {subject.name} ({grade?.name}) are available in the Paper Library.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  masteryContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  progressIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  description: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionTitle: {
    ...FONTS.h3,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  actionSubtitle: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  paperPlaceholder: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  placeholderText: {
    ...FONTS.body,
    color: COLORS.textMuted,
    flex: 1,
  }
});
