-- Development Seed Data
-- Used only for testing the Topic Hub UI locally.

DO $$
DECLARE
    curr_id UUID;
    grade_id UUID;
    sub_id UUID;
    top1_id UUID;
    top2_id UUID;
BEGIN
    -- 1. Insert Curriculum
    INSERT INTO public.curricula (name, code, country, description) 
    VALUES ('Namibian', 'NAM', 'Namibia', 'Namibian National Curriculum')
    RETURNING id INTO curr_id;

    -- 2. Insert Grade
    INSERT INTO public.grades (curriculum_id, name, code, level_order) 
    VALUES (curr_id, 'NSSCAS', 'GR12_AS', 12)
    RETURNING id INTO grade_id;

    -- 3. Insert Curriculum Subject
    INSERT INTO public.curriculum_subjects (grade_id, name, code, sequence_order) 
    VALUES (grade_id, 'Biology', 'BIO', 1)
    RETURNING id INTO sub_id;

    -- 4. Insert Topics
    INSERT INTO public.topics (subject_id, name, code, description, sequence_order) 
    VALUES (sub_id, 'Genetics', 'GEN', 'Inheritance and genetic variation', 1)
    RETURNING id INTO top1_id;

    INSERT INTO public.topics (subject_id, name, code, description, sequence_order) 
    VALUES (sub_id, 'Cell Structure', 'CELL', 'Basic unit of life', 2)
    RETURNING id INTO top2_id;

    -- 5. Map some existing quizzes to Genetics (if they exist)
    -- This assumes there are quizzes with topic_name = 'Genetics'
    UPDATE public.quizzes 
    SET topic_id = top1_id 
    WHERE topic_name ILIKE '%Genetics%' AND topic_id IS NULL;

    -- Map some existing flashcards
    UPDATE public.flashcards 
    SET topic_id = top1_id 
    WHERE topic ILIKE '%Genetics%' AND topic_id IS NULL;

END $$;
