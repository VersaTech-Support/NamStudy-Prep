import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import BlockEditorCard from '@/components/admin/curriculum/BlockEditorCard';
import BlockRenderer from '@/components/admin/curriculum/BlockRenderer';

type Topic = Database['public']['Tables']['topics']['Row'];
type ContentBlock = Database['public']['Tables']['topic_content']['Row'];

export default function CurriculumTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (id) fetchTopicData();
  }, [id]);

  const fetchTopicData = async () => {
    setLoading(true);
    try {
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', id)
        .single();
      
      if (topicError) throw topicError;
      setTopic(topicData);

      const { data: blocksData, error: blocksError } = await supabase
        .from('topic_content')
        .select('*')
        .eq('topic_id', id)
        .order('sequence_order', { ascending: true });

      if (blocksError) throw blocksError;
      setBlocks(blocksData || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveTopicStatus = async (status: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('topics')
        .update({ publication_status: status })
        .eq('id', id);
      if (error) throw error;
      setTopic(prev => prev ? { ...prev, publication_status: status } : null);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update topic status');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = async (type: string) => {
    const newBlock = {
      topic_id: id,
      block_type: type as any,
      content: {},
      sequence_order: blocks.length,
      is_published: true,
      is_required: true,
    };
    
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('topic_content')
        .insert(newBlock)
        .select()
        .single();
      if (error) throw error;
      setBlocks([...blocks, data]);
    } catch (error: any) {
      console.error('addBlock error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to add block: ' + error.message);
      } else {
        Alert.alert('Error', 'Failed to add block: ' + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = (index: number, updates: Partial<ContentBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    setBlocks(newBlocks);
  };

  const removeBlock = async (index: number) => {
    const block = blocks[index];
    
    const confirmRemove = async () => {
      try {
        setSaving(true);
        const { error } = await supabase.from('topic_content').delete().eq('id', block.id);
        if (error) throw error;
        const newBlocks = blocks.filter((_, i) => i !== index);
        // Reorder remaining
        const reordered = newBlocks.map((b, i) => ({ ...b, sequence_order: i }));
        setBlocks(reordered);
        if (reordered.length > 0) {
          await Promise.all(
            reordered.map(b => 
              supabase.from('topic_content').update({ sequence_order: b.sequence_order }).eq('id', b.id)
            )
          );
        }
      } catch (error: any) {
        console.error('removeBlock error:', error);
        if (Platform.OS === 'web') window.alert('Failed to remove block: ' + error.message);
        else Alert.alert('Error', 'Failed to remove block: ' + error.message);
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to remove this block?')) {
        confirmRemove();
      }
    } else {
      Alert.alert('Remove Block', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: confirmRemove
        }
      ]);
    }
  };

  const moveBlock = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    newBlocks.forEach((b, i) => { b.sequence_order = i; });
    setBlocks(newBlocks);
    
    try {
      setSaving(true);
      await Promise.all(
        newBlocks.map(b => 
          supabase.from('topic_content').update({ sequence_order: b.sequence_order }).eq('id', b.id)
        )
      );
    } catch {
      Alert.alert('Error', 'Failed to reorder blocks');
    } finally {
      setSaving(false);
    }
  };

  const saveAllContent = async () => {
    try {
      setSaving(true);
      await Promise.all(
        blocks.map(b => 
          supabase.from('topic_content').update({ content: b.content }).eq('id', b.id)
        )
      );
      Alert.alert('Success', 'Content saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isPublished = topic?.publication_status === 'published';

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{topic?.name}</Text>
          <Text style={styles.subtitle}>{blocks.length} Content Blocks</Text>
        </View>
        
        <View style={styles.headerControls}>
          <TouchableOpacity 
            style={[styles.modeToggleBtn, previewMode && styles.modeToggleBtnActive]}
            onPress={() => setPreviewMode(!previewMode)}
          >
            <Ionicons name={previewMode ? 'eye' : 'eye-outline'} size={18} color={previewMode ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.modeToggleText, previewMode && { color: COLORS.primary }]}>
              {previewMode ? 'Previewing' : 'Preview'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.publishBtn, isPublished ? styles.publishBtnActive : styles.publishBtnDraft]}
            onPress={() => saveTopicStatus(isPublished ? 'draft' : 'published')}
          >
            <Ionicons name={isPublished ? 'checkmark-circle' : 'document-text'} size={16} color={isPublished ? COLORS.greenDark : COLORS.goldDark} />
            <Text style={[styles.publishBtnText, { color: isPublished ? COLORS.greenDark : COLORS.goldDark }]}>
              {isPublished ? 'PUBLISHED' : 'DRAFT'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {blocks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color={COLORS.borderLight} />
            <Text style={styles.emptyText}>No content blocks yet.</Text>
          </View>
        ) : (
          previewMode ? (
            <View style={styles.previewContainer}>
              {blocks.map(block => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </View>
          ) : (
            blocks.map((block, index) => (
              <BlockEditorCard
                key={block.id}
                block={block}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                onChange={(updates) => updateBlock(index, updates)}
                onRemove={() => removeBlock(index)}
                onMoveUp={() => moveBlock(index, 'up')}
                onMoveDown={() => moveBlock(index, 'down')}
              />
            ))
          )
        )}

        {!previewMode && (
          <View style={styles.addSection}>
            <Text style={styles.addSectionTitle}>Add Content Block</Text>
            <View style={styles.blockTypes}>
              {[
                { type: 'heading', icon: 'text' },
                { type: 'paragraph', icon: 'document-text' },
                { type: 'image', icon: 'image' },
                { type: 'callout', icon: 'information-circle' },
                { type: 'formula', icon: 'calculator' },
                { type: 'key_term', icon: 'key' },
                { type: 'bullet_list', icon: 'list' },
              ].map(bt => (
                <TouchableOpacity 
                  key={bt.type} 
                  style={styles.addTypeBtn}
                  onPress={() => addBlock(bt.type)}
                >
                  <Ionicons name={bt.icon as any} size={20} color={COLORS.primary} />
                  <Text style={styles.addTypeText}>{bt.type.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {!previewMode && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.saveBtn}
            onPress={saveAllContent}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="save" size={20} color={COLORS.white} />
                <Text style={styles.saveBtnText}>Save Content</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
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
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
    zIndex: 10,
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
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 4,
  },
  modeToggleBtnActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '30',
  },
  modeToggleText: {
    ...FONTS.small,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  publishBtnDraft: {
    backgroundColor: COLORS.goldLight,
    borderColor: COLORS.gold + '40',
  },
  publishBtnActive: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.green + '40',
  },
  publishBtnText: {
    ...FONTS.small,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  previewContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
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
    marginTop: SPACING.md,
  },
  addSection: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
  },
  addSectionTitle: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  blockTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  addTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SPACING.xs,
  },
  addTypeText: {
    ...FONTS.small,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.lg,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  saveBtnText: {
    ...FONTS.h3,
    color: COLORS.white,
  }
});
