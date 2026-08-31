import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TopicContentProgress {
  topicId: string;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  lastViewedAt: string | null;
}

export interface SubjectContentProgress {
  subjectId: string;
  /** Weighted average: sum(topic.progress_percent) / count(published_topics) */
  overallPercent: number;
  topicCount: number;
  startedCount: number;
  completedCount: number;
  topicProgress: TopicContentProgress[];
}

// ─── Subject Content Progress ───────────────────────────────────────────────

/**
 * Calculates content completion progress for a subject.
 *
 * CALCULATION:
 *   overall = sum(progress_percent for each published topic) / count(published topics)
 *
 * A topic with no progress record is treated as 0%.
 * A topic with progress_percent >= 90 is counted as "completed".
 *
 * This is CONTENT COMPLETION, not quiz mastery. A student can have:
 *   - Notes: 100%, Mastery: 42%  → "Finished reading, needs practice"
 *   - Notes: 30%,  Mastery: 90%  → "Knows it well, hasn't finished reading"
 */
export async function getSubjectContentProgress(
  userId: string,
  subjectId: string
): Promise<SubjectContentProgress> {
  const empty: SubjectContentProgress = {
    subjectId,
    overallPercent: 0,
    topicCount: 0,
    startedCount: 0,
    completedCount: 0,
    topicProgress: [],
  };

  if (!userId || !subjectId) return empty;

  try {
    // 1. Get all published topic IDs for this subject
    const { data: topics, error: topicErr } = await supabase
      .from('topics')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('publication_status', 'published');

    if (topicErr || !topics || topics.length === 0) return empty;

    const topicIds = topics.map((t) => t.id);

    // 2. Get student progress for these topics (single batched query)
    const { data: progressRows, error: progressErr } = await supabase
      .from('student_content_progress')
      .select('topic_id, progress_percent, started_at, completed_at, last_viewed_at')
      .eq('user_id', userId)
      .in('topic_id', topicIds);

    if (progressErr) {
      console.error('Content progress query error:', progressErr);
      return empty;
    }

    // 3. Build lookup
    const progressMap = new Map<string, typeof progressRows extends (infer T)[] ? T : never>();
    for (const row of progressRows || []) {
      progressMap.set(row.topic_id, row);
    }

    // 4. Calculate
    let totalPercent = 0;
    let startedCount = 0;
    let completedCount = 0;
    const topicProgress: TopicContentProgress[] = [];

    for (const topicId of topicIds) {
      const row = progressMap.get(topicId);
      const percent = row?.progress_percent ?? 0;

      totalPercent += percent;
      if (percent > 0) startedCount++;
      if (percent >= 90) completedCount++;

      topicProgress.push({
        topicId,
        progressPercent: percent,
        startedAt: row?.started_at ?? null,
        completedAt: row?.completed_at ?? null,
        lastViewedAt: row?.last_viewed_at ?? null,
      });
    }

    return {
      subjectId,
      overallPercent: Math.round(totalPercent / topicIds.length),
      topicCount: topicIds.length,
      startedCount,
      completedCount,
      topicProgress,
    };
  } catch (err) {
    console.error('Content progress calculation error:', err);
    return empty;
  }
}

// ─── Single Topic Content Progress ──────────────────────────────────────────

/**
 * Returns the content completion progress for a single topic.
 */
export async function getTopicContentProgress(
  userId: string,
  topicId: string
): Promise<TopicContentProgress> {
  const empty: TopicContentProgress = {
    topicId,
    progressPercent: 0,
    startedAt: null,
    completedAt: null,
    lastViewedAt: null,
  };

  if (!userId || !topicId) return empty;

  try {
    const { data, error } = await supabase
      .from('student_content_progress')
      .select('progress_percent, started_at, completed_at, last_viewed_at')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    if (error || !data) return empty;

    return {
      topicId,
      progressPercent: data.progress_percent ?? 0,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      lastViewedAt: data.last_viewed_at,
    };
  } catch {
    return empty;
  }
}
