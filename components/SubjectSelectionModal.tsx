import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { Database } from '@/types/database';

type SubjectWithGrade = Database['public']['Tables']['curriculum_subjects']['Row'] & {
  grades: Database['public']['Tables']['grades']['Row'] | null;
};

interface SubjectSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onEnrollSuccess?: () => void;
}

export default function SubjectSelectionModal({ visible, onClose, onEnrollSuccess }: SubjectSelectionModalProps) {
  const { user } = useUser();
  const [subjects, setSubjects] = useState<SubjectWithGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchSubjects();
    }
  }, [visible]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('curriculum_subjects')
        .select(`
          *,
          grades (*)
        `)
        .order('name');
      
      if (error) throw error;
      setSubjects(data as unknown as SubjectWithGrade[]);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (subject: SubjectWithGrade) => {
    if (!user) return;
    try {
      setEnrolling(subject.id);
      
      // 1. Insert or update student_subjects
      const { error: enrollError } = await supabase
        .from('student_subjects')
        .upsert(
          {
            user_id: user.id,
            curriculum_subject_id: subject.id,
            is_active: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id, curriculum_subject_id' }
        );
        
      if (enrollError) throw enrollError;

      // 2. Backward compatibility: Add to users.subjects string array if not present
      const currentSubjects = user.subjects || [];
      if (!currentSubjects.includes(subject.name)) {
        const { error: userError } = await supabase
          .from('users')
          .update({ subjects: [...currentSubjects, subject.name] })
          .eq('id', user.id);
        
        if (userError) throw userError;
      }

      if (onEnrollSuccess) {
        onEnrollSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to enroll:', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to enroll: ' + err.message);
      }
    } finally {
      setEnrolling(null);
    }
  };

  // Group by Grade
  const groupedSubjects = subjects.reduce((acc, sub) => {
    const gradeName = sub.grades?.name || 'Other';
    if (!acc[gradeName]) acc[gradeName] = [];
    acc[gradeName].push(sub);
    return acc;
  }, {} as Record<string, SubjectWithGrade[]>);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add a Course</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.subtitle}>Select a subject to add to your study dashboard</Text>
            
            {Object.entries(groupedSubjects).map(([grade, subs]) => (
              <View key={grade} style={styles.gradeSection}>
                <Text style={styles.gradeTitle}>{grade}</Text>
                {subs.map((subject) => (
                  <View key={subject.id} style={styles.subjectCard}>
                    <View style={styles.subjectInfo}>
                      <View style={[styles.iconContainer, { backgroundColor: subject.color || COLORS.primary }]}>
                        <Ionicons name={(subject.icon as any) || 'book'} size={20} color={COLORS.white} />
                      </View>
                      <View>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        {subject.description && (
                          <Text style={styles.subjectDesc}>{subject.description}</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.enrollButton}
                      onPress={() => handleEnroll(subject)}
                      disabled={enrolling === subject.id}
                    >
                      {enrolling === subject.id ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={styles.enrollButtonText}>Add</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  gradeSection: {
    marginBottom: SPACING.xl,
  },
  gradeTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  subjectName: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  subjectDesc: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  enrollButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    minWidth: 70,
    alignItems: 'center',
  },
  enrollButtonText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
    fontSize: 14,
  }
});
