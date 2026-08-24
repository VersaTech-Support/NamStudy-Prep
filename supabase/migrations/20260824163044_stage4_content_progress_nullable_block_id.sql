-- Make content_block_id nullable so we can create progress records when opening a topic
ALTER TABLE public.student_content_progress ALTER COLUMN content_block_id DROP NOT NULL;
