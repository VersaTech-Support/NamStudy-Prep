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

interface Topic {
  id: string;
  name: string;
  description: string;
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
  const [mastery, setMastery] = useState<number | null>(null);

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

      // 6. Calculate Mastery from quiz_results (CURRENT TOPIC MASTERY = MOST RECENT COMPLETED QUIZ ATTEMPT FOR THIS USER + TOPIC)
      if (tData && user) {
        let rQuery = supabase
          .from('quiz_results')
          .select('score, total_questions')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        // Use topic_id if possible, fallback to topic_name string match
        if (tData.id) {
            rQuery = rQuery.or(`topic_id.eq.${tData.id},topic_name.eq.${tData.name}`);
        } else {
            rQuery = rQuery.eq('topic_name', tData.name);
        }

        const { data: rData } = await rQuery;
          
        if (rData && rData.length > 0) {
          const recent = rData[0];
          if (recent.total_questions > 0) {
            setMastery(Math.round((recent.score / recent.total_questions) * 100));
          }
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
        
        {/* Overview & Mastery */}
        <View style={styles.masteryContainer}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          {mastery !== null ? (
          <View>
            <ProgressBar 
              progress={mastery / 100} 
              height={12} 
              color={mastery >= 70 ? COLORS.green : mastery >= 50 ? COLORS.gold : COLORS.red} 
            />
            <Text style={{ ...FONTS.small, color: COLORS.textSecondary, marginTop: 4 }}>
              {mastery}% Mastered
            </Text>
          </View>
          ) : (
            <Text style={styles.noMasteryText}>
              Practice this topic to build your mastery score.
            </Text>
          )}
        </View>

        {topic.description ? (
          <Text style={styles.description}>{topic.description}</Text>
        ) : null}

        {/* Study Actions */}
        <SectionHeader title="Study Tools" />
        <View style={styles.actionGrid}>
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
  noMasteryText: {
    ...FONTS.body,
    color: COLORS.textMuted,
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
