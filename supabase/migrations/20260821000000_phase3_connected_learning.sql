-- Migration: Phase 3 Connected Learning Model
-- Adds academic hierarchy (curriculum -> grade -> subject -> topic)
-- and connects existing quizzes and flashcards.

-- 1. Create Curricula Table
CREATE TABLE IF NOT EXISTS public.curricula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    country TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Grades Table
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id UUID NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    level_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Curriculum Subjects Table (Distinct from legacy application subjects catalog)
CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    sequence_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(grade_id, name)
);

-- 4. Create Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.curriculum_subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    sequence_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, name)
);

-- 5. Add topic_id to Quizzes (nullable for backward compatibility)
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- 6. Add topic_id to Flashcards (nullable for backward compatibility)
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- 7. Add topic_id to quiz_attempts and quiz_results
ALTER TABLE public.quiz_attempts 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

ALTER TABLE public.quiz_results 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;



-- RLS Configuration

-- Enable RLS
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Select Policies (Authenticated users only)
CREATE POLICY "Auth read curricula" ON public.curricula FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read grades" ON public.grades FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read curriculum_subjects" ON public.curriculum_subjects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth read topics" ON public.topics FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin Write Policies
-- Assuming users table has is_admin = true (based on prior codebase audit)
CREATE POLICY "Admin insert curricula" ON public.curricula FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admin update curricula" ON public.curricula FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admin delete curricula" ON public.curricula FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "Admin insert grades" ON public.grades FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admin update grades" ON public.grades FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admin delete grades" ON public.grades FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "Admin insert curriculum_subjects" ON public.curriculum_subjects FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admin update curriculum_subjects" ON public.curriculum_subjects FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admin delete curriculum_subjects" ON public.curriculum_subjects FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);

CREATE POLICY "Admin insert topics" ON public.topics FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admin update topics" ON public.topics FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admin delete topics" ON public.topics FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
);
