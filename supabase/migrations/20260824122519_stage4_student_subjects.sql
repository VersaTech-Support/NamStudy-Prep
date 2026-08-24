-- Stage 4: Student Subject Enrollment and Content Progress

-- ==========================================
-- 1. STUDENT SUBJECTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.student_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    curriculum_subject_id UUID NOT NULL REFERENCES public.curriculum_subjects(id) ON DELETE CASCADE,
    target_grade TEXT,
    exam_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, curriculum_subject_id)
);

-- Enable RLS
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

-- Students can read their own enrollments
CREATE POLICY "Auth read own student_subjects"
    ON public.student_subjects FOR SELECT
    USING (auth.uid() = user_id);

-- Students can insert their own enrollments
CREATE POLICY "Auth insert own student_subjects"
    ON public.student_subjects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Students can update their own enrollments
CREATE POLICY "Auth update own student_subjects"
    ON public.student_subjects FOR UPDATE
    USING (auth.uid() = user_id);

-- Students can delete their own enrollments
CREATE POLICY "Auth delete own student_subjects"
    ON public.student_subjects FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can read all student subjects
CREATE POLICY "Admin read all student_subjects"
    ON public.student_subjects FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));


-- ==========================================
-- 2. STUDENT CONTENT PROGRESS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.student_content_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.student_content_progress ENABLE ROW LEVEL SECURITY;

-- Ensure columns exist in case table was already created differently
ALTER TABLE public.student_content_progress 
    ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Students can read their own progress
CREATE POLICY "Auth read own student_content_progress"
    ON public.student_content_progress FOR SELECT
    USING (auth.uid() = user_id);

-- Students can insert their own progress
CREATE POLICY "Auth insert own student_content_progress"
    ON public.student_content_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Students can update their own progress
CREATE POLICY "Auth update own student_content_progress"
    ON public.student_content_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can read all progress
CREATE POLICY "Admin read all student_content_progress"
    ON public.student_content_progress FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));

-- ==========================================
-- 3. INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_student_subjects_user 
    ON public.student_subjects(user_id);
    
CREATE INDEX IF NOT EXISTS idx_student_content_progress_user 
    ON public.student_content_progress(user_id);
