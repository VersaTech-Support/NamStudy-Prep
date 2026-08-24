-- Migration: Phase 7 — Curriculum Notes, Content & Progress System
-- Extends the existing curriculum hierarchy with sections, block-based content,
-- granular student progress tracking, and confidence feedback.
--
-- Architecture decisions:
--   - topic_content uses one row per content block (not one JSON doc per topic)
--   - student_content_progress is the granular SOURCE OF TRUTH
--   - student_topic_progress is a derived/aggregated state
--   - Quiz mastery remains completely separate from content completion

-- ═══════════════════════════════════════════════════════════════════════
-- 1. TOPIC SECTIONS — Groups topics within a subject (e.g., Theory, Practical)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.topic_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.curriculum_subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sequence_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, name)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. EXTEND EXISTING TABLES
-- ═══════════════════════════════════════════════════════════════════════

-- Extend curriculum_subjects with visual identity and metadata
ALTER TABLE public.curriculum_subjects
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Extend topics with section assignment and metadata
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.topic_sections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ═══════════════════════════════════════════════════════════════════════
-- 3. TOPIC CONTENT — Block-based educational content (one row per block)
-- ═══════════════════════════════════════════════════════════════════════
-- 
-- Each block represents one logical unit of content (heading, paragraph,
-- formula, image, callout, key_term, etc.) and stores its payload as JSONB.
--
-- Example block_types and their JSONB content shapes:
--   heading:      { "text": "Cell Structure", "level": 2 }
--   paragraph:    { "text": "Cells are the basic..." }
--   rich_text:    { "html": "<p>Rich <b>formatted</b> content</p>" }
--   formula:      { "latex": "x^2 + bx + c = 0", "display": true }
--   image:        { "url": "...", "caption": "Figure 1", "alt": "..." }
--   callout:      { "type": "info|warning|tip", "title": "...", "text": "..." }
--   key_term:     { "term": "Osmosis", "definition": "The movement of..." }
--   bullet_list:  { "items": ["item1", "item2"] }
--   numbered_list:{ "items": ["step1", "step2"] }
--   table:        { "headers": [...], "rows": [[...], [...]] }
--   example:      { "title": "Example 1", "content": "..." }
--   summary:      { "points": ["point1", "point2"] }
--   video:        { "url": "...", "title": "..." }
--   divider:      {}

CREATE TABLE IF NOT EXISTS public.topic_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL CHECK (block_type IN (
        'heading', 'paragraph', 'rich_text', 'formula', 'image',
        'callout', 'key_term', 'bullet_list', 'numbered_list',
        'table', 'example', 'summary', 'video', 'divider', 'warning', 'attachment'
    )),
    content JSONB NOT NULL DEFAULT '{}',
    sequence_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. CONTENT PUBLICATION STATUS ON TOPICS
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived'));

-- ═══════════════════════════════════════════════════════════════════════
-- 5. STUDENT CONTENT PROGRESS — Granular per-block tracking (SOURCE OF TRUTH)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.student_content_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_block_id UUID NOT NULL REFERENCES public.topic_content(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, content_block_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. STUDENT TOPIC PROGRESS — Derived/aggregated from content progress
-- ═══════════════════════════════════════════════════════════════════════
-- 
-- This is NOT an independent source of truth.
-- It is updated when content block progress changes.
-- 
-- Progress chain:
--   content block progress → topic progress → subject progress → curriculum progress

CREATE TABLE IF NOT EXISTS public.student_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_percent NUMERIC(5,2) DEFAULT 0,
    last_content_block_id UUID REFERENCES public.topic_content(id) ON DELETE SET NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. STUDENT TOPIC CONFIDENCE — Self-reported confidence after studying
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.student_topic_confidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    confidence TEXT NOT NULL CHECK (confidence IN ('need_help', 'still_learning', 'almost_there', 'confident')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keep history (multiple rows per user+topic) so we can track confidence trends.
-- The latest row (ORDER BY created_at DESC LIMIT 1) is the current confidence.

-- ═══════════════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════

-- topics RLS override (restrict students to published)
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read topics" ON public.topics;
CREATE POLICY "Auth read published topics"
    ON public.topics FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND (
            publication_status = 'published'
            OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
        )
    );

-- topic_sections
ALTER TABLE public.topic_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read topic_sections"
    ON public.topic_sections FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insert topic_sections"
    ON public.topic_sections FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

CREATE POLICY "Admin update topic_sections"
    ON public.topic_sections FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

CREATE POLICY "Admin delete topic_sections"
    ON public.topic_sections FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

-- topic_content
ALTER TABLE public.topic_content ENABLE ROW LEVEL SECURITY;

-- Students can only see published content
CREATE POLICY "Auth read published topic_content"
    ON public.topic_content FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND (
            is_published = true
            OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
        )
    );

CREATE POLICY "Admin insert topic_content"
    ON public.topic_content FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

CREATE POLICY "Admin update topic_content"
    ON public.topic_content FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

CREATE POLICY "Admin delete topic_content"
    ON public.topic_content FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

-- student_content_progress
ALTER TABLE public.student_content_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content progress"
    ON public.student_content_progress FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin read all content progress"
    ON public.student_content_progress FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

-- student_topic_progress
ALTER TABLE public.student_topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own topic progress"
    ON public.student_topic_progress FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin read all topic progress"
    ON public.student_topic_progress FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

-- student_topic_confidence
ALTER TABLE public.student_topic_confidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own confidence"
    ON public.student_topic_confidence FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin read all confidence"
    ON public.student_topic_confidence FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

-- ═══════════════════════════════════════════════════════════════════════
-- 9. INDEXES
-- ═══════════════════════════════════════════════════════════════════════

-- topic_sections
CREATE INDEX IF NOT EXISTS idx_topic_sections_subject_order
    ON public.topic_sections(subject_id, sequence_order);

-- topic_content
CREATE INDEX IF NOT EXISTS idx_topic_content_topic_order
    ON public.topic_content(topic_id, sequence_order);

CREATE INDEX IF NOT EXISTS idx_topic_content_topic_published
    ON public.topic_content(topic_id, is_published);

-- topics with section
CREATE INDEX IF NOT EXISTS idx_topics_section_order
    ON public.topics(section_id, sequence_order);

-- student_content_progress
CREATE INDEX IF NOT EXISTS idx_student_content_progress_user_topic
    ON public.student_content_progress(user_id, topic_id);

CREATE INDEX IF NOT EXISTS idx_student_content_progress_user_block
    ON public.student_content_progress(user_id, content_block_id);

-- student_topic_progress
CREATE INDEX IF NOT EXISTS idx_student_topic_progress_user
    ON public.student_topic_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_student_topic_progress_user_topic
    ON public.student_topic_progress(user_id, topic_id);

-- student_topic_confidence
CREATE INDEX IF NOT EXISTS idx_student_topic_confidence_user_topic
    ON public.student_topic_confidence(user_id, topic_id, created_at DESC);
