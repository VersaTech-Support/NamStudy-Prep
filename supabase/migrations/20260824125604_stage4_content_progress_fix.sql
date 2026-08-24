-- Ensure columns exist in case table was already created differently
ALTER TABLE public.student_content_progress 
    ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
