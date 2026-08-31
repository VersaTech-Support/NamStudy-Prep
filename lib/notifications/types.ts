// ─── Notification System Type Definitions ───────────────────────────────────
// Central types for the NamStudy notification & engagement system.
// No notification logic should live outside lib/notifications/.

/** Supported notification categories */
export type NotificationType =
  | 'study_reminder'
  | 'streak'
  | 'weak_topic'
  | 'achievement'
  | 'exam_countdown'
  | 'content_update'
  | 'system';

/** Strict route types for deep linking — never trust untrusted strings */
export type NotificationRouteType =
  | 'topic'
  | 'subject'
  | 'notes'
  | 'analytics'
  | 'home';

/** Structured payload carried inside notification data */
export interface NotificationPayload {
  type: NotificationType;
  topicId?: string;
  subjectId?: string;
  routeType: NotificationRouteType;
}

/** Internal candidate produced by the rules engine before delivery */
export interface NotificationCandidate {
  type: NotificationType;
  title: string;
  body: string;
  priority: number;
  data: NotificationPayload;
  dedupeKey: string;
}

/** Android notification channel definitions */
export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: number; // maps to AndroidImportance
}

/** Notification preference model — mirrors the DB table */
export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  study_reminders: boolean;
  streak_reminders: boolean;
  weak_topic_reminders: boolean;
  achievement_notifications: boolean;
  exam_countdown_notifications: boolean;
  content_notifications: boolean;
  system_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null; // HH:MM format
  quiet_hours_end: string | null;   // HH:MM format
  timezone: string | null;
  updated_at: string;
}

/** Default preferences applied when a user first opts in */
export const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'user_id' | 'updated_at'> = {
  push_enabled: false,
  study_reminders: true,
  streak_reminders: true,
  weak_topic_reminders: true,
  achievement_notifications: true,
  exam_countdown_notifications: true,
  content_notifications: true,
  system_notifications: true,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: null,
};

/** Notification frequency policy — centralized limits */
export const NOTIFICATION_POLICY = {
  MAX_DAILY_PUSH: 3,
  MAX_STUDY_REMINDERS_PER_DAY: 1,
  MAX_WEAK_TOPIC_PER_TOPIC_PER_DAY: 1,
  MAX_STREAK_REMINDERS_PER_DAY: 1,
  INACTIVITY_THRESHOLD_HOURS: 48,
  WEAK_TOPIC_MASTERY_THRESHOLD: 70,
} as const;

/** Android notification channel config */
export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  { id: 'study', name: 'Study Reminders', description: 'Reminders to continue studying and practice weak topics', importance: 3 },
  { id: 'achievement', name: 'Achievements', description: 'Streak milestones and learning achievements', importance: 3 },
  { id: 'exam', name: 'Exam Countdown', description: 'Countdown reminders for upcoming exams', importance: 4 },
  { id: 'system', name: 'System', description: 'Important account and system notifications', importance: 4 },
];

/** Map notification types to Android channels */
export const TYPE_TO_CHANNEL: Record<NotificationType, string> = {
  study_reminder: 'study',
  streak: 'study',
  weak_topic: 'study',
  achievement: 'achievement',
  exam_countdown: 'exam',
  content_update: 'study',
  system: 'system',
};

/** Strict route resolution — notification type + payload → safe Expo Router path */
export function resolveNotificationRoute(payload: NotificationPayload): string {
  switch (payload.routeType) {
    case 'topic':
      return payload.topicId ? `/topic/${payload.topicId}` : '/';
    case 'subject':
      return payload.subjectId ? `/subject/${payload.subjectId}` : '/';
    case 'notes':
      return payload.topicId ? `/topic/${payload.topicId}/notes` : '/';
    case 'analytics':
      return '/analytics';
    case 'home':
    default:
      return '/';
  }
}
