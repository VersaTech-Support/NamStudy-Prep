export type MasteryState = 'NO_DATA' | 'NEEDS_PRACTICE' | 'DEVELOPING' | 'STRONG' | 'EXCELLENT';

export type TrendDirection = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';

export interface TopicMastery {
  topic_name: string;
  topic_id?: string | null;
  subject: string;
  masteryScore: number;
  attempts: number;
  latestScore: number;
  latestAttemptDate: string;
  state: MasteryState;
  trend: TrendDirection;
  isLowConfidence: boolean; // Flagged if latest attempt has 1-3 questions
}

export interface SubjectMastery {
  subject: string;
  averageMastery: number;
  totalAttempts: number;
  strongTopics: TopicMastery[];
  weakTopics: TopicMastery[];
}

export interface StudyRecommendation {
  type: 'topic_quiz' | 'flashcards' | 'past_paper' | 'review_topic' | 'continue';
  title: string;
  description: string;
  topicId?: string | null;
  topicName?: string | null;
  subject?: string;
  gradeLevel?: string;
  priority: number;
  reason: string; // Explains WHY it was recommended
}
