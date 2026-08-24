import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, GRADIENTS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';

// Use centralized mastery for the progress card
import { getUserMastery } from '@/lib/learning/mastery';
import ProgressBar from '@/components/ui/ProgressBar';

export default function StudentSubjectDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [subject, setSubject] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Progress Data
  const [masteryScore, setMasteryScore] = useState(0);
  const [studentSubjectRecord, setStudentSubjectRecord] = useState<any>(null);

  useEffect(() => {
    if (id && user) {
      fetchSubjectData();
      fetchProgressData();
    }
  }, [id, user]);

  const fetchSubjectData = async () => {
    setLoading(true);
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
            id, name, estimated_minutes, publication_status, sequence_order
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
      
      // Expand all by default
      const initialExpanded: Record<string, boolean> = {};
      processedSections.forEach(sec => {
        initialExpanded[sec.id] = true;
      });
      setExpandedSections(initialExpanded);

    } catch (err) {
      console.error('Failed to fetch subject:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressData = async () => {
    if (!user) return;
    try {
      // 1. Fetch from student_subjects for target grade/exam date
      const { data: ssData } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('user_id', user.id)
        .eq('curriculum_subject_id', id)
        .single();
      
      setStudentSubjectRecord(ssData);

      // 2. Fetch centralized mastery for this specific subject
      const masteryData = await getUserMastery(user.id);
      // Try to find by Name
      const currentSubjectMastery = masteryData.subjectMastery.find(
        (sm: any) => sm.subject === subject?.name
      );
      if (currentSubjectMastery) {
        setMasteryScore(currentSubjectMastery.averageMastery);
      }
    } catch (err) {
      // Ignore errors for missing progress
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

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

  const gradeName = subject.grades?.name || '';
  const currName = subject.grades?.curricula?.name || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        
        <View style={[styles.iconContainer, { backgroundColor: subject.color || COLORS.primary }]}>
          <Ionicons name={(subject.icon as any) || 'book'} size={32} color={COLORS.white} />
        </View>
        
        <Text style={styles.subjectTitle}>{subject.name}</Text>
        <Text style={styles.subjectSubtitle}>{currName} {currName && gradeName ? '|' : ''} {gradeName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Progress Card */}
        <LinearGradient
          colors={GRADIENTS.primary}
          style={styles.progressCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>My Progress</Text>
            <Text style={styles.progressPercentage}>{masteryScore}%</Text>
          </View>
          <ProgressBar progress={masteryScore / 100} color={COLORS.white} height={12} style={styles.progressBar} />
          
          <View style={styles.progressDetailsRow}>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                Target Grade: {studentSubjectRecord?.target_grade || 'Not Set'}
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                Exam Date: {studentSubjectRecord?.exam_date || 'Not Set'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="pencil" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Global Actions */}
        <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/papers')}>
          <Text style={styles.actionRowText}>Past Paper Walkthrough</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Sections */}
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>This subject is being prepared.</Text>
          </View>
        ) : (
          sections.map(section => {
            const isExpanded = expandedSections[section.id];
            
            return (
              <View key={section.id} style={styles.sectionContainer}>
                <TouchableOpacity 
                  style={styles.sectionHeader} 
                  onPress={() => toggleSection(section.id)}
                >
                  <Text style={styles.sectionTitle}>{section.name}</Text>
                  <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.topicsContainer}>
                    {section.topics.length === 0 ? (
                      <Text style={styles.emptyTopicText}>No topics are available yet.</Text>
                    ) : (
                      section.topics.map((topic: any) => (
                        <TouchableOpacity 
                          key={topic.id} 
                          style={styles.topicRow}
                          onPress={() => router.push(`/topic/${topic.id}`)}
                        >
                          <View style={styles.topicRowContent}>
                            <Text style={styles.topicName}>{topic.name}</Text>
                            {topic.estimated_minutes && (
                              <Text style={styles.topicMeta}>{topic.estimated_minutes} min</Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { ...FONTS.h3, color: COLORS.red },
  
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: SPACING.lg, padding: SPACING.xs },
  iconContainer: { width: 64, height: 64, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  subjectTitle: { ...FONTS.h1, color: COLORS.textPrimary, textAlign: 'center' },
  subjectSubtitle: { ...FONTS.small, color: COLORS.textMuted, marginTop: SPACING.xs },
  
  scrollContent: { padding: SPACING.lg, paddingBottom: 100 },
  
  progressCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  progressTitle: { ...FONTS.h3, color: COLORS.white },
  progressPercentage: { ...FONTS.h3, color: COLORS.white },
  progressBar: { backgroundColor: 'rgba(255,255,255,0.3)' },
  progressDetailsRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, flexWrap: 'wrap', gap: SPACING.sm },
  progressBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  progressBadgeText: { ...FONTS.small, color: COLORS.white },
  editButton: { backgroundColor: 'rgba(255,255,255,0.3)', width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  actionRowText: { ...FONTS.h3, color: COLORS.textPrimary },
  
  sectionContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitle: { ...FONTS.h3, color: COLORS.textPrimary },
  
  topicsContainer: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  topicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  topicRowContent: { flex: 1 },
  topicName: { ...FONTS.body, color: COLORS.textPrimary, marginBottom: 2 },
  topicMeta: { ...FONTS.small, color: COLORS.textMuted },
  
  emptyState: { padding: SPACING.xl, alignItems: 'center' },
  emptyStateText: { ...FONTS.body, color: COLORS.textMuted },
  emptyTopicText: { ...FONTS.small, color: COLORS.textMuted, padding: SPACING.md, textAlign: 'center' }
});
