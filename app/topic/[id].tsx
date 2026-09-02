import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '@/constants/theme';
import { FEATURES } from '@/constants/features';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';

import { getUserMastery } from '@/lib/learning/mastery';
import { getTopicContentProgress } from '@/lib/learning/contentProgress';
import { TopicMastery } from '@/lib/learning/types';

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
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<CurriculumSubject | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [topicMastery, setTopicMastery] = useState<TopicMastery | null>(null);
  const [contentProgressPercent, setContentProgressPercent] = useState(0);

  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'papers'>('notes');

  useEffect(() => {
    fetchTopicData();
  }, [id]);

  const fetchTopicData = async () => {
    setLoading(true);
    try {
      const { data: tData, error: tErr } = await supabase
        .from('topics')
        .select('*')
        .eq('id', id)
        .single();
      
      if (tData) {
        setTopic(tData);
        const { data: sData } = await supabase
          .from('curriculum_subjects')
          .select('*')
          .eq('id', tData.subject_id)
          .single();
          
        if (sData) {
          setSubject(sData);
          const { data: gData } = await supabase
            .from('grades')
            .select('*')
            .eq('id', sData.grade_id)
            .single();
            
          if (gData) {
            setGrade(gData);
            const { data: cData } = await supabase
              .from('curricula')
              .select('*')
              .eq('id', gData.curriculum_id)
              .single();
            if (cData) setCurriculum(cData);
          }
        }
      }

      const { count: fCount } = await supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('topic_id', id);
      setFlashcardCount(fCount || 0);

      const { count: qCount } = await supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('topic_id', id);
      setQuizCount(qCount || 0);

      if (tData && user) {
        const cp = await getTopicContentProgress(user.id, id);
        setContentProgressPercent(cp.progressPercent);

        const masteryData = await getUserMastery(user.id);
        const thisTopicMastery = masteryData.topicMastery.find(t => t.topic_id === id);
        if (thisTopicMastery) {
          setTopicMastery(thisTopicMastery);
        }
      }

    } catch (err) {
      console.error("Error fetching topic:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState text="Loading Topic..." />;
  if (!topic || !subject) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <EmptyState 
          icon="document-text-outline"
          title="Topic Unavailable"
          description="We couldn't find the requested topic."
          actionText="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          <Text style={styles.backText}>{subject.name}</Text>
        </TouchableOpacity>
        
        <Text style={styles.topicTitle}>{topic.name}</Text>
        <Text style={styles.topicSubtitle}>
          {curriculum?.name} • {grade?.name}
        </Text>

        {/* ─── Segmented Control ────────────────────────────────── */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segment, activeTab === 'notes' && styles.segmentActive]}
            onPress={() => setActiveTab('notes')}
          >
            <Text style={[styles.segmentText, activeTab === 'notes' && styles.segmentTextActive]}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segment, activeTab === 'quiz' && styles.segmentActive]}
            onPress={() => setActiveTab('quiz')}
          >
            <Text style={[styles.segmentText, activeTab === 'quiz' && styles.segmentTextActive]}>Quiz</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segment, activeTab === 'papers' && styles.segmentActive]}
            onPress={() => setActiveTab('papers')}
          >
            <Text style={[styles.segmentText, activeTab === 'papers' && styles.segmentTextActive]}>Papers</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {activeTab === 'notes' && (
          <View>
            <Text style={styles.sectionTitle}>Start studying</Text>
            
            {/* Core Concept / Continue Notes */}
            <View style={styles.coreCard}>
              <View style={styles.coreHeader}>
                <Ionicons name="book" size={24} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.coreTitle}>Core Concept</Text>
                  <Text style={styles.coreDesc} numberOfLines={2}>
                    {topic.description || 'Dive into the fundamental principles and theories for this topic.'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressRow}>
                <View style={{ flex: 1 }}>
                  <ProgressBar progress={contentProgressPercent / 100} color={COLORS.primary} />
                  <Text style={styles.progressText}>{contentProgressPercent}% read</Text>
                </View>
                <TouchableOpacity 
                  style={styles.continueBtn}
                  onPress={() => router.push(`/topic/${topic.id}/notes` as any)}
                >
                  <Text style={styles.continueBtnText}>
                    {contentProgressPercent === 0 ? 'Start notes' : 'Continue notes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Related practice</Text>
            
            {/* Flashcards */}
            <TouchableOpacity 
              style={styles.practiceCard}
              onPress={() => router.push(`/flashcards?topic_id=${topic.id}&topic_name=${encodeURIComponent(topic.name)}` as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.practiceIcon, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="albums-outline" size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.practiceTitle}>Flashcards</Text>
                <Text style={styles.practiceSub}>{flashcardCount} cards</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Quick Quiz */}
            <TouchableOpacity 
              style={styles.practiceCard}
              onPress={() => router.push(`/quiz/${encodeURIComponent(topic.name)}?topic_id=${topic.id}&subject=${encodeURIComponent(subject.name)}` as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.practiceIcon, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="help-circle-outline" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.practiceTitle}>Quick Quiz</Text>
                <Text style={styles.practiceSub}>{quizCount} questions available</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
            
            {/* AI Tutor */}
            {FEATURES.ENABLE_NAMTUTOR && (
              <TouchableOpacity 
                style={styles.practiceCard}
                onPress={() => {
                  router.push({
                    pathname: '/tutor',
                    params: {
                      topicId: topic.id,
                      topicName: topic.name,
                      subject: subject.name,
                    }
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.practiceIcon, { backgroundColor: COLORS.primaryLight + '20' }]}>
                  <Ionicons name="sparkles-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.practiceTitle}>Ask NamTutor</Text>
                  <Text style={styles.practiceSub}>Get instant AI help with {topic.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'quiz' && (
          <View>
            <View style={styles.masteryCard}>
              <Text style={styles.masteryLabel}>Quiz Mastery</Text>
              <Text style={styles.masteryScore}>{topicMastery ? `${topicMastery.masteryScore}%` : '0%'}</Text>
              <ProgressBar 
                progress={topicMastery ? topicMastery.masteryScore / 100 : 0} 
                color={topicMastery && topicMastery.masteryScore >= 50 ? COLORS.green : COLORS.gold} 
              />
              <Text style={styles.masterySub}>
                {topicMastery 
                  ? `Based on ${topicMastery.attempts} attempt${topicMastery.attempts !== 1 ? 's' : ''}` 
                  : 'Take a quiz to build your mastery score'}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={() => router.push(`/quiz/${encodeURIComponent(topic.name)}?topic_id=${topic.id}&subject=${encodeURIComponent(subject.name)}` as any)}
            >
              <Text style={styles.primaryBtnText}>Start Quiz</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'papers' && (
          <View style={styles.placeholderCard}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.placeholderTitle}>Past Papers</Text>
            <Text style={styles.placeholderText}>
              Find relevant exam papers for {subject.name} in the Paper Library.
            </Text>
            <TouchableOpacity 
              style={[styles.primaryBtn, { marginTop: SPACING.lg, width: '100%' }]}
              onPress={() => router.push(`/papers?subject=${encodeURIComponent(subject.name)}` as any)}
            >
              <Text style={styles.primaryBtnText}>Browse Papers</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backText: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
    marginLeft: 4,
  },
  topicTitle: {
    ...FONTS.h1,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  topicSubtitle: {
    ...FONTS.body,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  segmentActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  segmentText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
  },

  content: {
    padding: SPACING.xl,
    paddingBottom: 100,
  },

  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  // Core Concept Card
  coreCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xl,
  },
  coreHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  coreTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  coreDesc: {
    ...FONTS.small,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  progressText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  continueBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  continueBtnText: {
    ...FONTS.small,
    color: COLORS.white,
    fontWeight: '700',
  },

  // Practice Cards
  practiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  practiceIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  practiceSub: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Mastery Tab
  masteryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  masteryLabel: {
    ...FONTS.bodyBold,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  masteryScore: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  masterySub: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },

  // Placeholder
  placeholderCard: {
    alignItems: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: SPACING.md,
  },
  placeholderTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  placeholderText: {
    ...FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
