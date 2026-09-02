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
  Modal,
  Switch,
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

// Grade definitions for Namibian system
const GRADE_DEFS = [
  { name: 'Grade 11', code: 'NSSCO', currCode: 'NSSCO', currName: 'Namibia Senior Secondary Certificate (Ordinary)', levelOrder: 11 },
  { name: 'Grade 12', code: 'NSSCAS', currCode: 'NSSCAS', currName: 'Namibia Senior Secondary Certificate (Advanced Subsidiary)', levelOrder: 12 },
];

// Icon + color mapping for known Namibian subjects
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
  'Woodwork':          { icon: 'hammer',           color: '#92400E' },
  'Agriculture':       { icon: 'nutrition',        color: '#65A30D' },
};

export default function CurriculumIndexScreen() {
  const router = useRouter();
  const [grades, setGrades] = useState<GradeWithSubjects[]>([]);
  const [ungradedSubjects, setUngradedSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [legacySubjects, setLegacySubjects] = useState<string[]>([]);
  const [gradeIds, setGradeIds] = useState<Record<string, string>>({}); // code -> gradeId
  const [existingMap, setExistingMap] = useState<Record<string, Set<string>>>({}); // gradeCode -> Set of subject names
  const [saving, setSaving] = useState<string | null>(null); // "SubjectName|GradeCode" currently saving

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

  // ─── Ensure grades exist and open modal ───────────────────────────
  const openManageModal = async () => {
    try {
      // 1. Fetch legacy subjects
      const { data: legacySubs, error: legErr } = await supabase
        .from('subjects')
        .select('name')
        .order('name');
      if (legErr) throw legErr;
      if (!legacySubs || legacySubs.length === 0) {
        const msg = 'No subjects found in the legacy "subjects" table.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Info', msg);
        return;
      }
      setLegacySubjects(legacySubs.map(s => s.name));

      // 2. Ensure curricula and grades exist for each GRADE_DEF
      const resolvedGradeIds: Record<string, string> = {};
      for (const def of GRADE_DEFS) {
        // Find or create curriculum
        let curriculumId: string;
        const { data: existCurr } = await supabase
          .from('curricula')
          .select('id')
          .eq('code', def.currCode)
          .limit(1);

        if (existCurr && existCurr.length > 0) {
          curriculumId = existCurr[0].id;
        } else {
          const { data: newCurr, error: cErr } = await supabase
            .from('curricula')
            .insert({ code: def.currCode, name: def.currName })
            .select()
            .single();
          if (cErr) throw cErr;
          curriculumId = newCurr.id;
        }

        // Find or create grade
        const { data: existGrade } = await supabase
          .from('grades')
          .select('id')
          .eq('curriculum_id', curriculumId)
          .eq('name', def.name)
          .limit(1);

        if (existGrade && existGrade.length > 0) {
          resolvedGradeIds[def.code] = existGrade[0].id;
        } else {
          const { data: newGrade, error: gErr } = await supabase
            .from('grades')
            .insert({ name: def.name, code: def.code, curriculum_id: curriculumId, level_order: def.levelOrder })
            .select()
            .single();
          if (gErr) throw gErr;
          resolvedGradeIds[def.code] = newGrade.id;
        }
      }
      setGradeIds(resolvedGradeIds);

      // 3. Fetch which subjects already exist under each grade
      const existMap: Record<string, Set<string>> = {};
      for (const def of GRADE_DEFS) {
        const gId = resolvedGradeIds[def.code];
        const { data: existSubs } = await supabase
          .from('curriculum_subjects')
          .select('name')
          .eq('grade_id', gId);
        existMap[def.code] = new Set((existSubs || []).map(s => s.name));
      }
      setExistingMap(existMap);

      setModalVisible(true);
    } catch (e: any) {
      console.error(e);
      const msg = 'Failed to load subjects: ' + e.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  // ─── Toggle a subject for a grade ─────────────────────────────────
  const handleToggle = async (subjectName: string, gradeCode: string, currentlyOn: boolean) => {
    const savingKey = `${subjectName}|${gradeCode}`;
    setSaving(savingKey);

    try {
      const gId = gradeIds[gradeCode];

      if (currentlyOn) {
        // Remove the subject from this grade
        const { error } = await supabase
          .from('curriculum_subjects')
          .delete()
          .eq('grade_id', gId)
          .eq('name', subjectName);
        if (error) throw error;

        setExistingMap(prev => {
          const updated = { ...prev };
          const set = new Set(updated[gradeCode]);
          set.delete(subjectName);
          updated[gradeCode] = set;
          return updated;
        });
      } else {
        // Add the subject to this grade
        const meta = SUBJECT_META[subjectName] || { icon: 'book', color: COLORS.primary };
        const { error } = await supabase
          .from('curriculum_subjects')
          .insert({
            grade_id: gId,
            name: subjectName,
            icon: meta.icon,
            color: meta.color,
          });
        if (error) throw error;

        setExistingMap(prev => {
          const updated = { ...prev };
          const set = new Set(updated[gradeCode]);
          set.add(subjectName);
          updated[gradeCode] = set;
          return updated;
        });
      }
    } catch (e: any) {
      console.error(e);
      const msg = `Failed to update ${subjectName}: ${e.message}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSaving(null);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    fetchCurriculumData(); // refresh the main list
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
      <View style={styles.pageHeader}>
        <Text style={styles.pageDescription}>
          Select a subject to manage its sections, topics, and content blocks.
        </Text>
        <TouchableOpacity style={styles.manageBtn} onPress={openManageModal}>
          <Ionicons name="settings-outline" size={18} color={COLORS.white} />
          <Text style={styles.manageBtnText}>Manage Subjects</Text>
        </TouchableOpacity>
      </View>

      {grades.length === 0 && ungradedSubjects.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="folder-open-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Curriculum Found</Text>
          <Text style={styles.emptyDesc}>
            There are no grades or subjects in the database.
          </Text>
          <TouchableOpacity 
            style={[styles.manageBtn, { marginTop: SPACING.md }]}
            onPress={openManageModal}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
            <Text style={styles.manageBtnText}>Add Subjects</Text>
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

      {/* ─── Subject Management Modal ─────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manage Subjects</Text>
                <Text style={styles.modalSubtitle}>
                  Toggle which grades each subject belongs to
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Column Headers */}
            <View style={styles.modalTableHeader}>
              <Text style={styles.modalColSubject}>Subject</Text>
              {GRADE_DEFS.map(def => (
                <Text key={def.code} style={styles.modalColGrade}>{def.code}</Text>
              ))}
            </View>

            {/* Subject Rows */}
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {legacySubjects.map(name => {
                const meta = SUBJECT_META[name] || { icon: 'book', color: COLORS.primary };
                return (
                  <View key={name} style={styles.modalRow}>
                    <View style={styles.modalRowLeft}>
                      <View style={[styles.modalRowIcon, { backgroundColor: meta.color + '15' }]}>
                        <Ionicons name={(meta.icon as any)} size={18} color={meta.color} />
                      </View>
                      <Text style={styles.modalRowName}>{name}</Text>
                    </View>
                    <View style={styles.modalRowToggles}>
                      {GRADE_DEFS.map(def => {
                        const isOn = existingMap[def.code]?.has(name) ?? false;
                        const isSaving = saving === `${name}|${def.code}`;
                        return (
                          <View key={def.code} style={styles.modalToggleCell}>
                            {isSaving ? (
                              <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                              <Switch
                                value={isOn}
                                onValueChange={() => handleToggle(name, def.code, isOn)}
                                trackColor={{ false: COLORS.borderLight, true: COLORS.primary + '60' }}
                                thumbColor={isOn ? COLORS.primary : '#f4f3f4'}
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Done Button */}
            <TouchableOpacity style={styles.modalDoneBtn} onPress={closeModal}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  pageDescription: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.sm,
  },
  manageBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
    fontSize: 13,
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
  // ─── Modal Styles ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    ...SHADOWS.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalClose: {
    padding: 4,
  },
  modalTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalColSubject: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalColGrade: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 80,
    textAlign: 'center',
  },
  modalList: {
    flex: 1,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight + '80',
  },
  modalRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalRowIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRowName: {
    ...FONTS.body,
    color: COLORS.textPrimary,
  },
  modalRowToggles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalToggleCell: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtn: {
    margin: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },
});
