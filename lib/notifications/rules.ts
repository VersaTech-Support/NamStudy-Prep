// ─── Notification Rules Engine ──────────────────────────────────────────────
// Determines if a student qualifies for specific notifications based on their
// actual learning state, streaks, and preferences.

import { NotificationCandidate, NotificationPreferences, NOTIFICATION_POLICY } from './types';
import { TopicMastery } from '@/lib/learning/types';

interface RuleContext {
  userId: string;
  preferences: NotificationPreferences;
  userTimezone: string;
  topicMastery: TopicMastery[];
  streak: { current: number; longest: number; lastActiveDate: string } | null;
  enrolledSubjects: any[];
  contentProgress: any[];
}

/** Helper to generate a deterministic dedupe key */
function createDedupeKey(userId: string, category: string, entityId: string, dateStr: string): string {
  return `${category}:${userId}:${entityId}:${dateStr}`;
}

/**
 * Checks if the current time is within the user's quiet hours.
 * Note: A robust implementation in an Edge Function should use timezone math.
 */
export function isQuietHours(preferences: NotificationPreferences, userTimezone: string): boolean {
  if (!preferences.quiet_hours_enabled || !preferences.quiet_hours_start || !preferences.quiet_hours_end) {
    return false;
  }

  // Assuming HH:MM format
  const now = new Date();
  
  // Basic implementation. Edge function should handle real timezone conversion.
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotal = currentHour * 60 + currentMinute;

  const [startH, startM] = preferences.quiet_hours_start.split(':').map(Number);
  const startTotal = startH * 60 + startM;

  const [endH, endM] = preferences.quiet_hours_end.split(':').map(Number);
  const endTotal = endH * 60 + endM;

  if (startTotal <= endTotal) {
    // e.g., 14:00 to 16:00
    return currentTotal >= startTotal && currentTotal <= endTotal;
  } else {
    // e.g., 22:00 to 07:00 (crosses midnight)
    return currentTotal >= startTotal || currentTotal <= endTotal;
  }
}

/**
 * Evaluate if a study reminder should be sent.
 * Conditions:
 * - Has enrolled subjects
 * - Has some content progress
 * - Last viewed is > INACTIVITY_THRESHOLD_HOURS ago
 */
export function evaluateStudyReminder(ctx: RuleContext): NotificationCandidate | null {
  if (!ctx.preferences.study_reminders) return null;
  if (ctx.enrolledSubjects.length === 0) return null;
  if (ctx.contentProgress.length === 0) return null;

  // Find the most recently accessed incomplete topic
  const recent = [...ctx.contentProgress]
    .filter(p => (p.highest_scroll_percentage || 0) < 100)
    .sort((a, b) => new Date(b.last_viewed_at).getTime() - new Date(a.last_viewed_at).getTime())[0];

  if (!recent) return null;

  const hoursInactive = (new Date().getTime() - new Date(recent.last_viewed_at).getTime()) / (1000 * 60 * 60);
  
  if (hoursInactive < NOTIFICATION_POLICY.INACTIVITY_THRESHOLD_HOURS) {
    return null;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  
  return {
    type: 'study_reminder',
    title: `Continue studying`,
    body: `You’re ${Math.round(recent.highest_scroll_percentage || 0)}% through this topic. Pick up where you left off.`,
    priority: 1,
    data: {
      type: 'study_reminder',
      topicId: recent.topic_id,
      routeType: 'notes'
    },
    dedupeKey: createDedupeKey(ctx.userId, 'study', recent.topic_id, todayStr)
  };
}

/**
 * Evaluate if a streak reminder should be sent.
 * Conditions:
 * - Has an active streak > 0
 * - Has not studied today
 */
export function evaluateStreakReminder(ctx: RuleContext): NotificationCandidate | null {
  if (!ctx.preferences.streak_reminders) return null;
  if (!ctx.streak || ctx.streak.current === 0) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  if (ctx.streak.lastActiveDate === todayStr) {
    // Already active today, no reminder needed
    return null;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (ctx.streak.lastActiveDate !== yesterdayStr) {
    // Streak is already dead, no reminder needed
    return null;
  }

  return {
    type: 'streak',
    title: `Keep your streak alive 🔥`,
    body: `Your ${ctx.streak.current}-day streak is waiting for you.`,
    priority: 2,
    data: {
      type: 'streak',
      routeType: 'home'
    },
    dedupeKey: createDedupeKey(ctx.userId, 'streak', 'daily', todayStr)
  };
}

/**
 * Evaluate if a weak topic reminder should be sent.
 * Conditions:
 * - Has a topic with mastery < 70% and declining trend
 */
export function evaluateWeakTopicReminder(ctx: RuleContext): NotificationCandidate | null {
  if (!ctx.preferences.weak_topic_reminders) return null;
  if (ctx.topicMastery.length === 0) return null;

  const weakDeclining = ctx.topicMastery
    .filter(t => t.masteryScore < NOTIFICATION_POLICY.WEAK_TOPIC_MASTERY_THRESHOLD && t.trend === 'DECLINING')
    .sort((a, b) => a.masteryScore - b.masteryScore)[0];

  if (!weakDeclining) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  return {
    type: 'weak_topic',
    title: `${weakDeclining.topic_name} needs a little practice`,
    body: `Your recent performance is ${weakDeclining.masteryScore}%. A quick practice session could help.`,
    priority: 3,
    data: {
      type: 'weak_topic',
      topicId: weakDeclining.topic_id || undefined,
      routeType: 'topic'
    },
    dedupeKey: createDedupeKey(ctx.userId, 'weak', weakDeclining.topic_id || 'unknown', todayStr)
  };
}
