-- Migration: Phase 6 Learning Intelligence Indexes
-- Supports deterministic mastery calculation queries

-- Optimize the common access pattern: Fetching a user's recent attempts for all topics
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_topic_created
ON public.quiz_results(user_id, topic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic_created
ON public.quiz_attempts(user_id, topic_id, created_at DESC);

-- Also optimize legacy querying by topic_name since some older records might lack topic_id
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_topic_name_created
ON public.quiz_results(user_id, topic_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic_name_created
ON public.quiz_attempts(user_id, topic_name, created_at DESC);
