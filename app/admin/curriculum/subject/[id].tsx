import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Subject = Database['public']['Tables']['curriculum_subjects']['Row'];
type Section = Database['public']['Tables']['topic_sections']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];

interface SectionWithTopics extends Section {
  topics: Topic[];
}

export default function CurriculumSubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [sections, setSections] = useState<SectionWithTopics[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (id) fetchSubjectData();
  }, [id]);

  const fetchSubjectData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('curriculum_subjects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // 2. Fetch Sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('topic_sections')
        .select('*')
        .eq('subject_id', id)
        .order('sequence_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      // 3. Fetch Topics (both with and without sections)
      // Actually topics are linked to curriculum_subjects usually, but now we have section_id.
      // We will fetch topics for this subject (if topics has subject_id, wait, topics table has subject_id?)
      // Let's check types/database.ts for topics table. 
      // Assuming topics has subject_id or is linked via section_id. Let's fetch topics by section_ids.
      const sectionIds = sectionsData.map(s => s.id);
      
      let topicsData: Topic[] = [];
      if (sectionIds.length > 0) {
        const { data: tData, error: tError } = await supabase
          .from('topics')
          .select('*')
          .in('section_id', sectionIds)
          .order('sequence_order', { ascending: true });
          
        if (tError) throw tError;
        topicsData = tData || [];
      }

      // Combine
      const combined = (sectionsData || []).map(section => ({
        ...section,
        topics: topicsData.filter(t => t.section_id === section.id).sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
      }));

      setSections(combined);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load subject data');
    } finally {
      setLoading(false);
    }
  };

  // Up/Down reordering logic
  const moveSection = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) return;
    
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    
    // Update sequence_order
    newSections.forEach((sec, i) => {
      sec.sequence_order = i;
    });
    
    setSections(newSections);
    
    // Persist
    await Promise.all(
      newSections.map(s => supabase.from('topic_sections').update({ sequence_order: s.sequence_order }).eq('id', s.id))
    );
  };

  const moveTopic = async (sectionIndex: number, topicIndex: number, direction: 'up' | 'down') => {
    const section = sections[sectionIndex];
    if ((direction === 'up' && topicIndex === 0) || (direction === 'down' && topicIndex === section.topics.length - 1)) return;

    const newSections = [...sections];
    const newTopics = [...section.topics];
    const targetIndex = direction === 'up' ? topicIndex - 1 : topicIndex + 1;

    // Swap
    const temp = newTopics[topicIndex];
    newTopics[topicIndex] = newTopics[targetIndex];
    newTopics[targetIndex] = temp;

    // Update sequence_order
    newTopics.forEach((t, i) => {
      t.sequence_order = i;
    });

    newSections[sectionIndex].topics = newTopics;
    setSections(newSections);

    // Persist
    await Promise.all(
      newTopics.map(t => supabase.from('topics').update({ sequence_order: t.sequence_order }).eq('id', t.id))
    );
  };

  const handleCreateSection = async () => {
    let sectionName = 'New Section';
    if (Platform.OS === 'web') {
      const input = window.prompt('Enter section name:');
      if (input === null) return;
      if (input.trim()) sectionName = input.trim();
    }
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('topic_sections')
        .insert({
          subject_id: id as string,
          name: sectionName,
          sequence_order: sections.length
        });
      if (error) throw error;
      await fetchSubjectData();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert('Failed to create section: ' + e.message);
      else Alert.alert('Error', 'Failed to create section');
      setLoading(false);
    }
  };

  const handleCreateTopic = async (sectionId: string, sectionIndex: number) => {
    let topicName = 'New Topic';
    if (Platform.OS === 'web') {
      const input = window.prompt('Enter topic name:');
      if (input === null) return;
      if (input.trim()) topicName = input.trim();
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('topics')
        .insert({
          subject_id: id as string,
          section_id: sectionId,
          name: topicName,
          publication_status: 'draft',
          sequence_order: sections[sectionIndex].topics.length
        });
      if (error) throw error;
      await fetchSubjectData();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert('Failed to create topic: ' + e.message);
      else Alert.alert('Error', 'Failed to create topic');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'published': return COLORS.green;
      case 'archived': return COLORS.red;
      case 'draft': 
      default: return COLORS.gold;
    }
  };

  // ─── Syllabus PDF handlers ─────────────────────────────────────────
  const handleUploadSyllabus = async (file: File) => {
    try {
      setUploadingSyllabus(true);
      const subjectName = (subject?.name || 'subject').replace(/\s+/g, '_');
      const fileName = `${subjectName}_syllabus_${Date.now()}.pdf`;

      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('syllabi')
        .upload(fileName, arrayBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('syllabi').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('curriculum_subjects')
        .update({ syllabus_url: data.publicUrl })
        .eq('id', id as string);

      if (updateError) throw updateError;

      setSubject(prev => prev ? { ...prev, syllabus_url: data.publicUrl } : prev);
      if (Platform.OS === 'web') window.alert('Syllabus uploaded successfully!');
      else Alert.alert('Success', 'Syllabus uploaded successfully!');
    } catch (e: any) {
      console.error(e);
      const msg = 'Failed to upload syllabus: ' + e.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setUploadingSyllabus(false);
    }
  };

  const handleRemoveSyllabus = async () => {
    const doRemove = Platform.OS === 'web'
      ? window.confirm('Remove the syllabus PDF from this subject?')
      : await new Promise<boolean>(resolve =>
          Alert.alert('Remove Syllabus', 'Remove the syllabus PDF from this subject?', [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
          ])
        );

    if (!doRemove) return;

    try {
      const { error } = await supabase
        .from('curriculum_subjects')
        .update({ syllabus_url: null })
        .eq('id', id as string);

      if (error) throw error;
      setSubject(prev => prev ? { ...prev, syllabus_url: null } : prev);
    } catch (e: any) {
      const msg = 'Failed to remove syllabus: ' + e.message;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const triggerFilePicker = () => {
    if (Platform.OS === 'web') {
      // Create or reuse a hidden file input
      if (!fileInputRef.current) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.style.display = 'none';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) handleUploadSyllabus(file);
          input.value = ''; // reset so same file can be picked again
        };
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      fileInputRef.current.click();
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
    <View style={styles.container}>
      {/* Subject Header */}
      <View style={styles.header}>
        <View style={[styles.subjectIcon, { backgroundColor: (subject?.color || COLORS.primary) + '15' }]}>
          <Ionicons name={(subject?.icon as any) || 'book'} size={32} color={subject?.color || COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{subject?.name}</Text>
          <Text style={styles.subtitle}>{sections.length} Sections</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={handleCreateSection}>
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Syllabus PDF Card */}
      <View style={styles.syllabusCard}>
        <View style={styles.syllabusLeft}>
          <Ionicons
            name={subject?.syllabus_url ? 'document-text' : 'document-text-outline'}
            size={22}
            color={subject?.syllabus_url ? COLORS.green : COLORS.textMuted}
          />
          <View style={{ marginLeft: SPACING.md, flex: 1 }}>
            <Text style={styles.syllabusTitle}>Syllabus PDF</Text>
            <Text style={styles.syllabusStatus}>
              {subject?.syllabus_url ? 'Uploaded' : 'No syllabus attached'}
            </Text>
          </View>
        </View>
        <View style={styles.syllabusActions}>
          {subject?.syllabus_url ? (
            <>
              <TouchableOpacity
                style={styles.syllabusBtn}
                onPress={() => {
                  if (Platform.OS === 'web') window.open(subject.syllabus_url!, '_blank');
                  else Linking.openURL(subject.syllabus_url!);
                }}
              >
                <Ionicons name="eye-outline" size={16} color={COLORS.accent} />
                <Text style={[styles.syllabusBtnText, { color: COLORS.accent }]}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.syllabusBtn} onPress={triggerFilePicker}>
                <Ionicons name="swap-horizontal" size={16} color={COLORS.gold} />
                <Text style={[styles.syllabusBtnText, { color: COLORS.gold }]}>Replace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.syllabusBtn} onPress={handleRemoveSyllabus}>
                <Ionicons name="trash-outline" size={16} color={COLORS.red} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.syllabusUploadBtn, uploadingSyllabus && { opacity: 0.5 }]}
              onPress={triggerFilePicker}
              disabled={uploadingSyllabus}
            >
              {uploadingSyllabus ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.syllabusUploadText}>Upload PDF</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={COLORS.borderLight} />
            <Text style={styles.emptyText}>No sections created yet.</Text>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreateSection}>
              <Text style={styles.createBtnText}>Create First Section</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sections.map((section, sIndex) => (
            <View key={section.id} style={styles.sectionCard}>
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionName}>{section.name}</Text>
                  {section.description && <Text style={styles.sectionDesc}>{section.description}</Text>}
                </View>
                <View style={styles.orderControls}>
                  <TouchableOpacity onPress={() => moveSection(sIndex, 'up')} disabled={sIndex === 0} style={[styles.iconBtn, sIndex === 0 && { opacity: 0.3 }]}>
                    <Ionicons name="chevron-up" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveSection(sIndex, 'down')} disabled={sIndex === sections.length - 1} style={[styles.iconBtn, sIndex === sections.length - 1 && { opacity: 0.3 }]}>
                    <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Coming soon', 'Edit section')}>
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Topics List */}
              <View style={styles.topicsContainer}>
                {section.topics.length === 0 ? (
                  <Text style={styles.emptyTopicText}>No topics in this section.</Text>
                ) : (
                  section.topics.map((topic, tIndex) => (
                    <TouchableOpacity 
                      key={topic.id} 
                      style={styles.topicRow}
                      onPress={() => router.push(`/admin/curriculum/topic/${topic.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.topicLeft}>
                        <View style={styles.topicIcon}>
                          <Ionicons name={(topic.icon as any) || 'document-text'} size={18} color={COLORS.textSecondary} />
                        </View>
                        <View>
                          <Text style={styles.topicName}>{topic.name}</Text>
                          <View style={styles.topicMeta}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(topic.publication_status) + '20' }]}>
                              <Text style={[styles.statusText, { color: getStatusColor(topic.publication_status) }]}>
                                {(topic.publication_status || 'draft').toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.topicTime}>{topic.estimated_minutes || 0} mins</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.orderControls}>
                        <TouchableOpacity 
                          onPress={(e) => { e.stopPropagation(); moveTopic(sIndex, tIndex, 'up'); }} 
                          disabled={tIndex === 0} 
                          style={[styles.iconBtn, tIndex === 0 && { opacity: 0.3 }]}
                        >
                          <Ionicons name="chevron-up" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={(e) => { e.stopPropagation(); moveTopic(sIndex, tIndex, 'down'); }} 
                          disabled={tIndex === section.topics.length - 1} 
                          style={[styles.iconBtn, tIndex === section.topics.length - 1 && { opacity: 0.3 }]}
                        >
                          <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
                
                <TouchableOpacity style={styles.addTopicBtn} onPress={() => handleCreateTopic(section.id, sIndex)}>
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                  <Text style={styles.addTopicText}>Add Topic</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  subjectIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerBtn: {
    padding: SPACING.sm,
  },
  list: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionHeaderLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  sectionName: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  sectionDesc: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  orderControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 6,
  },
  topicsContainer: {
    padding: SPACING.md,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.sm,
  },
  topicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topicIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  topicName: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topicTime: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  emptyTopicText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    padding: SPACING.md,
    textAlign: 'center',
  },
  addTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  addTopicText: {
    ...FONTS.bodyBold,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
    marginTop: SPACING.xxl,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
  },
  createBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },
  // Syllabus card styles
  syllabusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  syllabusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syllabusTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  syllabusStatus: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  syllabusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  syllabusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    gap: 4,
  },
  syllabusBtnText: {
    ...FONTS.small,
    fontWeight: '600',
  },
  syllabusUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary + '10',
    gap: 6,
  },
  syllabusUploadText: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
    fontSize: 13,
  }
});
