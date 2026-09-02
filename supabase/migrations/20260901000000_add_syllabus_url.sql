-- Migration: Add syllabus_url to curriculum_subjects
-- Allows admins to attach a syllabus PDF to each subject.

ALTER TABLE public.curriculum_subjects
ADD COLUMN IF NOT EXISTS syllabus_url TEXT;

-- Create the syllabi storage bucket (public, for PDF access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('syllabi', 'syllabi', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read syllabi
CREATE POLICY "Public read syllabi"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'syllabi');

-- Allow admin users to upload syllabi
CREATE POLICY "Admin upload syllabi"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'syllabi'
        AND EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Allow admin users to delete syllabi
CREATE POLICY "Admin delete syllabi"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'syllabi'
        AND EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true)
    );
