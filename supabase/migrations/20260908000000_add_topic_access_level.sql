-- Phase 1: Add access_level to topics table
-- Safe default: VIP (new topics are VIP by default, admin must explicitly set to FREE)

ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'VIP'
  CHECK (access_level IN ('FREE', 'VIP'));

-- Index for filtering by access level
CREATE INDEX IF NOT EXISTS idx_topics_access_level ON public.topics(access_level);

-- Seed: set the FIRST published topic per subject to FREE (so every subject has a free preview)
WITH first_topics AS (
  SELECT DISTINCT ON (subject_id) id
  FROM public.topics
  WHERE publication_status = 'published'
  ORDER BY subject_id, sequence_order ASC, created_at ASC
)
UPDATE public.topics SET access_level = 'FREE'
WHERE id IN (SELECT id FROM first_topics);

-- Update RLS: topic_content access is now gated by topic access_level + subscription
-- FREE topics: all authenticated users can read published content
-- VIP topics: only VIP/Pro users (or admins) can read published content
DROP POLICY IF EXISTS "Auth read published topic_content" ON public.topic_content;
CREATE POLICY "Read topic_content with access control"
  ON public.topic_content FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Admins see everything
      EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
      -- Published content only
      OR (
        is_published = true
        AND (
          -- FREE topics: everyone can read content
          EXISTS (
            SELECT 1 FROM public.topics
            WHERE topics.id = topic_content.topic_id
            AND topics.access_level = 'FREE'
          )
          -- VIP topics: only VIP/Pro users
          OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.subscription_status IN ('VIP', 'Pro')
          )
        )
      )
    )
  );
