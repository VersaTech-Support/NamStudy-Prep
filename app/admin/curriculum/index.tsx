import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Grade = Database['public']['Tables']['grades']['Row'];
type Subject = Database['public']['Tables']['curriculum_subjects']['Row'];

interface GradeWithSubjects extends Grade {
  subjects: Subject[];
}

export default function CurriculumIndexScreen() {
  const router = useRouter();
  const [grades, setGrades] = useState<GradeWithSubjects[]>([]);
  const [ungradedSubjects, setUngradedSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurriculumData();
  }, []);

  const fetchCurriculumData = async () => {
    setLoading(true);
    try {
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .order('level_order', { ascending: true });

      if (gradesError) throw gradesError;

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('curriculum_subjects')
        .select('*')
        .order('sequence_order', { ascending: true });

      if (subjectsError) throw subjectsError;

      const combined = (gradesData || []).map(grade => ({
        ...grade,
        subjects: (subjectsData || []).filter(s => s.grade_id === grade.id)
      }));

      const ungraded = (subjectsData || []).filter(s => !s.grade_id || !gradesData?.find(g => g.id === s.grade_id));

      setGrades(combined);
      setUngradedSubjects(ungraded);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to load curriculum data');
      } else {
        Alert.alert('Error', 'Failed to load curriculum data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Icon + color mapping for known Namibian NSSCAS subjects
  const SUBJECT_META: Record<string, { icon: string; color: string }> = {
    'Mathematics':       { icon: 'calculator',      color: '#3B82F6' },
    'Biology':           { icon: 'leaf',             color: '#10B981' },
    'Chemistry':         { icon: 'flask',            color: '#8B5CF6' },
    'Physics':           { icon: 'pulse',            color: '#F59E0B' },
    'Computer Science':  { icon: 'code-slash',       color: '#06B6D4' },
    'English':           { icon: 'text',             color: '#EC4899' },
    'Geography':         { icon: 'globe',            color: '#14B8A6' },
    'History':           { icon: 'time',             color: '#A78BFA' },
    'Accounting':        { icon: 'cash',             color: '#059669' },
    'Business Studies':  { icon: 'briefcase',        color: '#D97706' },
    'Economics':         { icon: 'trending-up',      color: '#EF4444' },
    'Art':               { icon: 'color-palette',    color: '#F472B6' },
    'Music':             { icon: 'musical-notes',    color: '#7C3AED' },
  };

  const handleImportLegacySubjects = async () => {
    try {
      setLoading(true);

      // 1. Fetch all legacy subjects
      const { data: legacySubjects, error: legacyErr } = await supabase
        .from('subjects')
        .select('name')
        .order('name');

      if (legacyErr) throw legacyErr;
      if (!legacySubjects || legacySubjects.length === 0) {
        const msg = 'No legacy subjects found in the "subjects" table.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Info', msg);
        setLoading(false);
        return;
      }

      // 2. Find or create the NSSCAS curriculum
      let curriculumId: string;
      const { data: existingCurricula } = await supabase
        .from('curricula')
        .select('id')
        .eq('code', 'NSSCAS')
        .limit(1);

      if (existingCurricula && existingCurricula.length > 0) {
        curriculumId = existingCurricula[0].id;
      } else {
        const { data: newCurriculum, error: currError } = await supabase
          .from('curricula')
          .insert({ code: 'NSSCAS', name: 'Namibia Senior Secondary Certificate (Advanced Subsidiary)' })
          .select()
          .single();
        if (currError) throw currError;
        curriculumId = newCurriculum.id;
      }

      // 3. Find or create Grade 12 under that curriculum
      let gradeId: string;
      const { data: existingGrades } = await supabase
        .from('grades')
        .select('id')
        .eq('curriculum_id', curriculumId)
        .eq('name', 'Grade 12')
        .limit(1);

      if (existingGrades && existingGrades.length > 0) {
        gradeId = existingGrades[0].id;
      } else {
        const { data: newGrade, error: gradeError } = await supabase
          .from('grades')
          .insert({ name: 'Grade 12', code: 'NSSCAS', curriculum_id: curriculumId, level_order: 12 })
          .select()
          .single();
        if (gradeError) throw gradeError;
        gradeId = newGrade.id;
      }

      // 4. Get existing curriculum_subjects for this grade to avoid duplicates
      const { data: existingSubs } = await supabase
        .from('curriculum_subjects')
        .select('name')
        .eq('grade_id', gradeId);
      const existingNames = new Set((existingSubs || []).map(s => s.name));

      // 5. Insert each legacy subject that doesn't already exist
      let imported = 0;
      let skipped = 0;
      for (let i = 0; i < legacySubjects.length; i++) {
        const name = legacySubjects[i].name;
        if (existingNames.has(name)) {
          skipped++;
          continue;
        }

        const meta = SUBJECT_META[name] || { icon: 'book', color: COLORS.primary };
        const { error: subError } = await supabase
          .from('curriculum_subjects')
          .insert({
            grade_id: gradeId,
            name,
            sequence_order: i + 1,
            icon: meta.icon,
            color: meta.color,
          });

        if (subError) throw subError;
        imported++;
      }

      // 6. Report results and reload
      const msg = `Imported ${imported} subject(s). ${skipped > 0 ? `${skipped} already existed.` : ''}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Success', msg);

      await fetchCurriculumData();
    } catch (e: any) {
      console.error(e);
      if (Platform.OS === 'web') {
        window.alert('Failed to import subjects: ' + e.message);
      } else {
        Alert.alert('Error', 'Failed to import subjects: ' + e.message);
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageDescription}>
        Select a subject to manage its sections, topics, and content blocks.
      </Text>

      {grades.length === 0 && ungradedSubjects.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="folder-open-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Curriculum Found</Text>
          <Text style={styles.emptyDesc}>
            There are no grades or subjects in the database.
          </Text>
          <TouchableOpacity 
            style={[styles.addSubjectBtn, { alignSelf: 'center', marginTop: SPACING.md }]}
            onPress={handleImportLegacySubjects}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addSubjectText}>Import Legacy Subjects</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {grades.map(grade => (
            <View key={grade.id} style={styles.gradeSection}>
              <View style={styles.gradeHeader}>
                <View>
                  <Text style={styles.gradeCode}>{grade.code || grade.name}</Text>
                  <Text style={styles.gradeName}>{grade.name}</Text>
                </View>
              </View>
              
              <View style={styles.subjectList}>
                {grade.subjects.length === 0 ? (
                  <Text style={styles.emptyText}>No subjects added yet.</Text>
                ) : (
                  grade.subjects.map(subject => (
                    <TouchableOpacity
                      key={subject.id}
                      style={styles.subjectCard}
                      onPress={() => router.push(`/admin/curriculum/subject/${subject.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.subjectIcon, { backgroundColor: (subject.color || COLORS.primary) + '15' }]}>
                        <Ionicons name={(subject.icon as any) || 'book'} size={24} color={subject.color || COLORS.primary} />
                      </View>
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        {subject.description && (
                          <Text style={styles.subjectDesc} numberOfLines={1}>{subject.description}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))
                )}
                
                <TouchableOpacity 
                  style={styles.addSubjectBtn}
                  onPress={handleImportLegacySubjects}
                >
                  <Ionicons name="download-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.addSubjectText}>Import Legacy Subjects</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {ungradedSubjects.length > 0 && (
            <View style={styles.gradeSection}>
              <View style={styles.gradeHeader}>
                <View>
                  <Text style={styles.gradeCode}>UNGRADED</Text>
                  <Text style={styles.gradeName}>Subjects without a grade</Text>
                </View>
              </View>
              
              <View style={styles.subjectList}>
                {ungradedSubjects.map(subject => (
                  <TouchableOpacity
                    key={subject.id}
                    style={styles.subjectCard}
                    onPress={() => router.push(`/admin/curriculum/subject/${subject.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.subjectIcon, { backgroundColor: (subject.color || COLORS.primary) + '15' }]}>
                      <Ionicons name={(subject.icon as any) || 'book'} size={24} color={subject.color || COLORS.primary} />
                    </View>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      {subject.description && (
                        <Text style={styles.subjectDesc} numberOfLines={1}>{subject.description}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageDescription: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  emptyStateContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyDesc: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  gradeSection: {
    marginBottom: SPACING.xxl,
  },
  gradeHeader: {
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: SPACING.sm,
  },
  gradeCode: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gradeName: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  subjectList: {
    gap: SPACING.sm,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
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
  },
  subjectDesc: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: SPACING.sm,
  },
  addSubjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.primary + '05',
  },
  addSubjectText: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  }
});
