-- phase8_security_audit.sql

-- 1. Drop the overly permissive policies
DROP POLICY IF EXISTS "Admin write access for announcements" ON public.school_announcements;
DROP POLICY IF EXISTS "Admin write access for timetables" ON public.school_timetables;

-- 2. School Announcements Strict Policies

-- INSERT: Controls new rows
CREATE POLICY "Strict insert access for announcements" ON public.school_announcements FOR INSERT WITH CHECK (
  (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
    AND school_id IS NULL
  )
  OR
  (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_school_admin = true AND users.school_id = school_announcements.school_id)
  )
);

-- UPDATE: Controls existing rows (USING) and new values (WITH CHECK)
CREATE POLICY "Strict update access for announcements" ON public.school_announcements FOR UPDATE 
USING (
  (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
    AND school_id IS NULL
  )
  OR
  (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_school_admin = true AND users.school_id = school_announcements.school_id)
  )
)
WITH CHECK (
  (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
    AND school_id IS NULL
  )
  OR
  (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_school_admin = true AND users.school_id = school_announcements.school_id)
  )
);

-- DELETE: Controls which rows can be deleted (USING)
CREATE POLICY "Strict delete access for announcements" ON public.school_announcements FOR DELETE USING (
  (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
    AND school_id IS NULL
  )
  OR
  (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_school_admin = true AND users.school_id = school_announcements.school_id)
  )
);


-- 3. School Timetables Strict Policies

-- INSERT
CREATE POLICY "Strict insert access for timetables" ON public.school_timetables FOR INSERT WITH CHECK (
  (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
    AND school_id IS NULL
  )
  OR
  (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_school_admin = true AND users.school_id = school_timetables.school_id)
  )
);

-- UPDATE
CREATE POLICY "Strict update access for timetables" ON public.school_timetables FOR UPDATE 
USING (
  (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
    AND school_id IS NULL
  )
  OR
  (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_school_admin = true AND users.school_id = school_timetables.school_id)
  )
)
WITH CHECK (
  (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
    AND school_id IS NULL
  )
  OR
  (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_school_admin = true AND users.school_id = school_timetables.school_id)
  )
);

-- DELETE
CREATE POLICY "Strict delete access for timetables" ON public.school_timetables FOR DELETE USING (
  (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
    AND school_id IS NULL
  )
  OR
  (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_school_admin = true AND users.school_id = school_timetables.school_id)
  )
);
