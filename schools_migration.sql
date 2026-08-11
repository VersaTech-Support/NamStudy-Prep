-- 1. Create schools table
CREATE TABLE public.schools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  code text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#6200EE',
  accent_color text DEFAULT '#03DAC6',
  created_at timestamptz DEFAULT now()
);

-- 2. Extend users table
ALTER TABLE public.users 
ADD COLUMN school_id uuid REFERENCES public.schools(id),
ADD COLUMN school_locked boolean DEFAULT false,
ADD COLUMN is_school_admin boolean DEFAULT false;

-- 3. Create school_announcements table
CREATE TABLE public.school_announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES public.schools(id),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES public.users(id),
  is_urgent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. Create school_timetables table
CREATE TABLE public.school_timetables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES public.schools(id),
  curriculum text,
  subject_name text,
  paper_code text,
  exam_date date,
  start_time text,
  duration text,
  venue text,
  created_at timestamptz DEFAULT now()
);

-- Basic RLS Policies

-- Enable RLS on new tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetables ENABLE ROW LEVEL SECURITY;

-- Schools: Public read, Super Admin write
CREATE POLICY "Public read access for schools" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Super admin all access for schools" ON public.schools USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.is_admin = true OR users.role = 'admin'))
);

-- Announcements: Public read, Admins/School Admins write
CREATE POLICY "Public read access for announcements" ON public.school_announcements FOR SELECT USING (true);
CREATE POLICY "Admin write access for announcements" ON public.school_announcements FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND (
      users.is_admin = true OR 
      users.role = 'admin' OR 
      (users.is_school_admin = true AND users.school_id = school_announcements.school_id)
    )
  )
);

-- Timetables: Public read, Admins/School Admins write
CREATE POLICY "Public read access for timetables" ON public.school_timetables FOR SELECT USING (true);
CREATE POLICY "Admin write access for timetables" ON public.school_timetables FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND (
      users.is_admin = true OR 
      users.role = 'admin' OR 
      (users.is_school_admin = true AND users.school_id = school_timetables.school_id)
    )
  )
);
