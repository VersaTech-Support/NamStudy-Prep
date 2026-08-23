import { supabase } from '@/lib/supabase';
import { TopicMastery, SubjectMastery, MasteryState, TrendDirection } from './types';

// The raw format we work with after deduping
interface NormalizedAttempt {
  topic_name: string;
  topic_id?: string | null;
  subject: string;
  score: number;
  total_questions: number;
  percentage: number;
  created_at: string;
}

/**
 * Calculates Recent Mastery Score using deterministic weighted recency:
 * 1 attempt: 100% latest
 * 2 attempts: 60% latest + 40% previous
 * 3+ attempts: 50% latest + 30% second + 20% third
 */
function calculateMasteryScore(attempts: NormalizedAttempt[]): number {
  if (!attempts || attempts.length === 0) return 0;
  
  // Sort descending by date
  const sorted = [...attempts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (sorted.length === 1) return sorted[0].percentage;
  if (sorted.length === 2) return (sorted[0].percentage * 0.6) + (sorted[1].percentage * 0.4);
  
  return (sorted[0].percentage * 0.5) + (sorted[1].percentage * 0.3) + (sorted[2].percentage * 0.2);
}

function getMasteryState(score: number, attemptsCount: number): MasteryState {
  if (attemptsCount === 0) return 'NO_DATA';
  if (score < 50) return 'NEEDS_PRACTICE';
  if (score < 70) return 'DEVELOPING';
  if (score < 85) return 'STRONG';
  return 'EXCELLENT';
}

function getTrend(attempts: NormalizedAttempt[]): TrendDirection {
  if (!attempts || attempts.length < 2) return 'INSUFFICIENT_DATA';
  
  const sorted = [...attempts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latest = sorted[0].percentage;
  const previous = sorted[1].percentage;
  
  // A simple deterministic trend
  if (latest > previous + 5) return 'IMPROVING';
  if (latest < previous - 5) return 'DECLINING';
  return 'STABLE';
}

/**
 * Fetches and processes all learning activity into a deterministic mastery model.
 * quiz_results is the authoritative source. quiz_attempts is consulted for history.
 */
export async function getUserMastery(userId: string) {
  if (!userId) return { topicMastery: [], subjectMastery: [] };

  try {
    const [resultsRes, attemptsRes] = await Promise.all([
      supabase.from('quiz_results').select('*').eq('user_id', userId),
      supabase.from('quiz_attempts').select('*').eq('user_id', userId),
    ]);

    const results = resultsRes.data || [];
    const legacyAttempts = attemptsRes.data || [];

    // Dedup: quiz_results is authoritative. 
    // We only include legacy attempts if we can't find an exact match by time + topic
    const normalized: NormalizedAttempt[] = [];
    const seenSignatures = new Set<string>();

    // 1. Process Authoritative Results
    for (const r of results) {
      // Some quiz_results might lack 'subject', default to 'Mathematics' per legacy behavior
      const subject = r.subject || 'Mathematics'; 
      const percentage = (r.total_questions > 0) ? Math.round((r.score / r.total_questions) * 100) : 0;
      
      const sig = `${r.topic_name}_${new Date(r.created_at).getTime()}`;
      seenSignatures.add(sig);

      normalized.push({
        topic_name: r.topic_name,
        topic_id: r.topic_id,
        subject,
        score: r.score,
        total_questions: r.total_questions,
        percentage,
        created_at: r.created_at
      });
    }

    // 2. Process Legacy Attempts securely
    for (const a of legacyAttempts) {
      const sig = `${a.topic_name}_${new Date(a.created_at).getTime()}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        normalized.push({
          topic_name: a.topic_name,
          topic_id: a.topic_id,
          subject: a.subject || 'Mathematics',
          score: a.score,
          total_questions: a.total_questions,
          percentage: (a.total_questions > 0) ? Math.round((a.score / a.total_questions) * 100) : 0,
          created_at: a.created_at
        });
      }
    }

    // Sort all normalized attempts newest to oldest
    normalized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 3. Group by Topic
    const topicGroups: Record<string, NormalizedAttempt[]> = {};
    for (const att of normalized) {
      if (!topicGroups[att.topic_name]) {
        topicGroups[att.topic_name] = [];
      }
      topicGroups[att.topic_name].push(att);
    }

    // 4. Calculate Topic Mastery
    const topicMasteryList: TopicMastery[] = [];
    for (const [topicName, attempts] of Object.entries(topicGroups)) {
      const latestAttempt = attempts[0]; // Already sorted descending
      const masteryScore = Math.round(calculateMasteryScore(attempts));
      
      topicMasteryList.push({
        topic_name: topicName,
        topic_id: latestAttempt.topic_id,
        subject: latestAttempt.subject,
        masteryScore,
        attempts: attempts.length,
        latestScore: latestAttempt.percentage,
        latestAttemptDate: latestAttempt.created_at,
        state: getMasteryState(masteryScore, attempts.length),
        trend: getTrend(attempts),
        isLowConfidence: latestAttempt.total_questions <= 3
      });
    }

    // 5. Group by Subject
    const subjectGroups: Record<string, TopicMastery[]> = {};
    for (const tm of topicMasteryList) {
      if (!subjectGroups[tm.subject]) subjectGroups[tm.subject] = [];
      subjectGroups[tm.subject].push(tm);
    }

    const subjectMasteryList: SubjectMastery[] = [];
    for (const [subject, topics] of Object.entries(subjectGroups)) {
      const totalAttempts = topics.reduce((sum, t) => sum + t.attempts, 0);
      const averageMastery = topics.length > 0 
        ? Math.round(topics.reduce((sum, t) => sum + t.masteryScore, 0) / topics.length) 
        : 0;

      subjectMasteryList.push({
        subject,
        averageMastery,
        totalAttempts,
        strongTopics: topics.filter(t => t.masteryScore >= 70).sort((a, b) => b.masteryScore - a.masteryScore),
        weakTopics: topics.filter(t => t.masteryScore < 70).sort((a, b) => a.masteryScore - b.masteryScore),
      });
    }

    return {
      topicMastery: topicMasteryList.sort((a, b) => new Date(b.latestAttemptDate).getTime() - new Date(a.latestAttemptDate).getTime()),
      subjectMastery: subjectMasteryList.sort((a, b) => b.averageMastery - a.averageMastery),
      allAttempts: normalized, // Exposing raw timeline for analytics activity feeds
    };
  } catch (error) {
    console.error('Mastery calculation error:', error);
    return { topicMastery: [], subjectMastery: [], allAttempts: [] };
  }
}
