-- admin_user_management.sql

-- 1. Create the hardened RPC
CREATE OR REPLACE FUNCTION public.set_school_admin_assignment(
  target_user_id uuid, 
  target_school_id uuid, 
  new_is_school_admin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_role text;
  target_is_admin boolean;
  current_school_id uuid;
BEGIN
  -- 1. Authorization: caller must be a Platform Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only Platform Admins can manage school assignments.';
  END IF;

  -- 2. Validate target user exists and fetch their role & school
  SELECT role, is_admin, school_id INTO target_role, target_is_admin, current_school_id
  FROM public.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user does not exist.';
  END IF;

  -- 3. Protect Platform Admins from being modified through this workflow
  IF target_is_admin = true OR target_role = 'admin' THEN
    RAISE EXCEPTION 'Platform Admins cannot be managed through the school assignment workflow.';
  END IF;

  -- 4. Require the target to be an eligible role (Teacher)
  IF target_role != 'teacher' THEN
    RAISE EXCEPTION 'Only teacher accounts can be managed through this workflow.';
  END IF;

  -- 5. Business logic: If granting School Admin, they must have a school assigned.
  IF new_is_school_admin = true AND target_school_id IS NULL THEN
    RAISE EXCEPTION 'A School Admin must be assigned to a school.';
  END IF;

  -- 6. Validate target school if assigning one
  IF target_school_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = target_school_id) THEN
      RAISE EXCEPTION 'Target school does not exist.';
    END IF;
  END IF;

  -- 7. Update the user (strict limit on fields, preserving role/is_admin)
  UPDATE public.users 
  SET 
    school_id = target_school_id,
    is_school_admin = new_is_school_admin,
    school_locked = CASE WHEN target_school_id IS NOT NULL THEN true ELSE false END
  WHERE id = target_user_id;
END;
$$;

-- 2. Explicitly control execution privileges
REVOKE EXECUTE ON FUNCTION public.set_school_admin_assignment(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_school_admin_assignment(uuid, uuid, boolean) TO authenticated;
