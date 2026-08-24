import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONTS, SPACING } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import BlockRenderer from '@/components/admin/curriculum/BlockRenderer';

export default function StudentNotesReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [topic, setTopic] = useState<any>(null);
  const [contentBlocks, setContentBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Progress tracking
  const [progress, setProgress] = useState(0);
  const maxProgressRef = useRef(0);
  const progressDbSyncRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchNotes();
      initProgress();
    }
    
    return () => {
      // Sync on unmount
      if (progressDbSyncRef.current) {
        clearTimeout(progressDbSyncRef.current);
      }
      syncProgressToDb(maxProgressRef.current);
    };
  }, [id]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // 1. Fetch Topic (MUST BE PUBLISHED)
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*, topic_sections(name, curriculum_subjects(name, grades(name)))')
        .eq('id', id)
        .eq('publication_status', 'published')
        .single();
        
      if (topicError || !topicData) {
        setErrorMsg('Notes for this topic are not available yet.');
        return;
      }
      setTopic(topicData);

      // 2. Fetch Content (MUST BE PUBLISHED)
      const { data: contentData, error: contentError } = await supabase
        .from('topic_content')
        .select('*')
        .eq('topic_id', id)
        .eq('is_published', true)
        .order('sequence_order', { ascending: true });

      if (contentError) throw contentError;
      setContentBlocks(contentData || []);

    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setErrorMsg('An error occurred while loading notes.');
    } finally {
      setLoading(false);
    }
  };

  const initProgress = async () => {
    if (!user || !id) return;
    
    // Check if progress exists
    const { data } = await supabase
      .from('student_content_progress')
      .select('progress_percent')
      .eq('user_id', user.id)
      .eq('topic_id', id)
      .single();
      
    if (data) {
      setProgress(data.progress_percent);
      maxProgressRef.current = data.progress_percent;
      
      // Update last_viewed_at
      await supabase
        .from('student_content_progress')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('topic_id', id);
    } else {
      // Create new progress record
      await supabase
        .from('student_content_progress')
        .insert({
          user_id: user.id,
          topic_id: id,
          progress_percent: 0,
          started_at: new Date().toISOString()
        });
    }
  };

  const syncProgressToDb = async (percent: number) => {
    if (!user || !id) return;
    
    const updateData: any = { 
      progress_percent: percent,
      last_viewed_at: new Date().toISOString()
    };
    
    if (percent === 100) {
      updateData.completed_at = new Date().toISOString();
    }

    try {
      await supabase
        .from('student_content_progress')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('topic_id', id);
    } catch (err) {
      // ignore silently
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    // Calculate how far down they are (0 to 1)
    const currentPosition = layoutMeasurement.height + contentOffset.y;
    const totalHeight = contentSize.height;
    
    let currentPercent = 0;
    
    if (totalHeight <= layoutMeasurement.height) {
      // Content fits on one screen
      currentPercent = 100;
    } else if (currentPosition >= totalHeight - paddingToBottom) {
      // Reached the bottom
      currentPercent = 100;
    } else {
      // Calculate percentage based on scroll
      currentPercent = Math.floor((currentPosition / totalHeight) * 100);
    }

    // Only update if we've made progress
    if (currentPercent > maxProgressRef.current) {
      maxProgressRef.current = currentPercent;
      setProgress(currentPercent);

      // Debounce DB write
      if (progressDbSyncRef.current) clearTimeout(progressDbSyncRef.current);
      progressDbSyncRef.current = setTimeout(() => {
        syncProgressToDb(currentPercent);
      }, 2000);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (errorMsg || !topic) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      </View>
    );
  }

  const subjectName = topic.topic_sections?.curriculum_subjects?.name || '';
  const gradeName = topic.topic_sections?.curriculum_subjects?.grades?.name || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{topic.name}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{subjectName} • {gradeName}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>
      
      {/* Progress Bar (Visual) */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.documentTitle}>{topic.name}</Text>
        
        {topic.estimated_minutes && (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{topic.estimated_minutes} min read</Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          {contentBlocks.length === 0 ? (
            <Text style={styles.emptyText}>No content available for this topic yet.</Text>
          ) : (
            contentBlocks.map(block => (
              <BlockRenderer key={block.id} block={block} />
            ))
          )}
        </View>
        
        {progress === 100 && contentBlocks.length > 0 && (
          <View style={styles.completeMessage}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.green} />
            <Text style={styles.completeText}>Topic Completed!</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  headerRight: {
    padding: SPACING.xs,
  },
  progressText: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: COLORS.borderLight,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  documentTitle: {
    ...FONTS.h1,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  metaText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  contentContainer: {
    marginTop: SPACING.md,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  completeMessage: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  completeText: {
    ...FONTS.h3,
    color: COLORS.green,
    marginTop: SPACING.sm,
  }
});
