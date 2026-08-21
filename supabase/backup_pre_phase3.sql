


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_name text;
  v_grade_level text;
  v_is_admin boolean := false;
BEGIN
  v_name := NEW.raw_user_meta_data->> 'name';
  v_grade_level := NEW.raw_user_meta_data->> 'grade_level';
  v_is_admin := COALESCE((NEW.raw_user_meta_data->> 'is_admin')::boolean, false);

  -- If the email already exists in public.users (from your old manual setup),
  -- this will automatically update its ID to match the new Auth UUID instead of crashing!
  INSERT INTO public.users (id, email, name, grade_level, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(v_name, 'Student'),
    COALESCE(v_grade_level, 'NSSCO'),
    v_is_admin
  )
  ON CONFLICT (email) DO UPDATE
  SET    
    id = EXCLUDED.id, -- Updates the old ID to the new Auth UUID seamlessly
    name = COALESCE(EXCLUDED.name, public.users.name),
    grade_level = COALESCE(EXCLUDED.grade_level, public.users.grade_level);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT coalesce(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_school_admin_assignment"("target_user_id" "uuid", "target_school_id" "uuid", "new_is_school_admin" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_school_admin_assignment"("target_user_id" "uuid", "target_school_id" "uuid", "new_is_school_admin" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."ai_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "id" integer NOT NULL,
    "latest_version" "text" NOT NULL,
    "force_update" boolean DEFAULT false,
    "download_url" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."app_config_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."app_config_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."app_config_id_seq" OWNED BY "public"."app_config"."id";



CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bookmarks_item_type_check" CHECK (("item_type" = ANY (ARRAY['paper'::"text", 'quiz'::"text"])))
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "topic_name" "text" NOT NULL,
    "grade_level" "text" NOT NULL,
    "front_content" "text" NOT NULL,
    "back_content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."flashcards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."papers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "year" integer NOT NULL,
    "paper_number" integer NOT NULL,
    "grade_level" "text" NOT NULL,
    "paper_pdf_url" "text" NOT NULL,
    "solution_pdf_url" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "subject" "text" DEFAULT 'Mathematics'::"text"
);


ALTER TABLE "public"."papers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "reference_number" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'NAD'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "bank_name" "text" NOT NULL,
    "admin_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "plan_type" "text" DEFAULT 'monthly'::"text"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topic_name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "grade_level" "text" NOT NULL,
    "score" integer NOT NULL,
    "total_questions" integer NOT NULL,
    "percentage" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "topic_name" "text" NOT NULL,
    "score" integer NOT NULL,
    "total_questions" integer NOT NULL,
    "grade_level" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."quiz_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic_name" "text" NOT NULL,
    "question" "text" NOT NULL,
    "option_a" "text" NOT NULL,
    "option_b" "text" NOT NULL,
    "option_c" "text" NOT NULL,
    "option_d" "text" NOT NULL,
    "correct_answer" "text" NOT NULL,
    "explanation_text" "text",
    "grade_level" "text" NOT NULL,
    "difficulty" "text" DEFAULT 'Medium'::"text",
    "subject" "text" DEFAULT 'Mathematics'::"text"
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid",
    "is_urgent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."school_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_timetables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "curriculum" "text",
    "subject_name" "text",
    "paper_code" "text",
    "exam_date" "date",
    "start_time" "text",
    "duration" "text",
    "venue" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."school_timetables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#6200EE'::"text",
    "accent_color" "text" DEFAULT '#03DAC6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "name" "text" NOT NULL
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "last_active_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_study_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_study_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "grade_level" "text" NOT NULL,
    "subscription_status" "text" DEFAULT 'Free'::"text",
    "expiry_date" timestamp with time zone,
    "is_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "school" "text",
    "subjects" "text"[] DEFAULT ARRAY['Mathematics'::"text"],
    "role" "text" DEFAULT 'student'::"text",
    "school_id" "uuid",
    "school_locked" boolean DEFAULT false,
    "is_school_admin" boolean DEFAULT false
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_config" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."app_config_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flashcards"
    ADD CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."papers"
    ADD CONSTRAINT "papers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_results"
    ADD CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_announcements"
    ADD CONSTRAINT "school_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_timetables"
    ADD CONSTRAINT "school_timetables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_study_plans"
    ADD CONSTRAINT "user_study_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_results"
    ADD CONSTRAINT "quiz_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_announcements"
    ADD CONSTRAINT "school_announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."school_announcements"
    ADD CONSTRAINT "school_announcements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."school_timetables"
    ADD CONSTRAINT "school_timetables_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_study_plans"
    ADD CONSTRAINT "user_study_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



CREATE POLICY "Admins can insert update delete quizzes" ON "public"."quizzes" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage papers" ON "public"."papers" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update payments status" ON "public"."payments" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Allow authenticated users to read profiles" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow public read access" ON "public"."app_config" FOR SELECT USING (true);



CREATE POLICY "Allow users to insert own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to update own profile or admins update all" ON "public"."users" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "id") OR "public"."is_admin"()));



CREATE POLICY "Allow users to view papers" ON "public"."papers" FOR SELECT USING (true);



CREATE POLICY "Anyone can view papers" ON "public"."papers" FOR SELECT USING (true);



CREATE POLICY "Anyone can view quizzes" ON "public"."quizzes" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert flashcards" ON "public"."flashcards" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users" ON "public"."subjects" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."subjects" FOR SELECT USING (true);



CREATE POLICY "Everyone can read flashcards" ON "public"."flashcards" FOR SELECT USING (true);



CREATE POLICY "Public read access for announcements" ON "public"."school_announcements" FOR SELECT USING (true);



CREATE POLICY "Public read access for schools" ON "public"."schools" FOR SELECT USING (true);



CREATE POLICY "Public read access for timetables" ON "public"."school_timetables" FOR SELECT USING (true);



CREATE POLICY "Strict delete access for announcements" ON "public"."school_announcements" FOR DELETE USING ((((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))) AND ("school_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_school_admin" = true) AND ("users"."school_id" = "school_announcements"."school_id"))))));



CREATE POLICY "Strict delete access for timetables" ON "public"."school_timetables" FOR DELETE USING ((((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))) AND ("school_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_school_admin" = true) AND ("users"."school_id" = "school_timetables"."school_id"))))));



CREATE POLICY "Strict insert access for announcements" ON "public"."school_announcements" FOR INSERT WITH CHECK ((((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))) AND ("school_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_school_admin" = true) AND ("users"."school_id" = "school_announcements"."school_id"))))));



CREATE POLICY "Strict insert access for timetables" ON "public"."school_timetables" FOR INSERT WITH CHECK ((((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))) AND ("school_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_school_admin" = true) AND ("users"."school_id" = "school_timetables"."school_id"))))));



CREATE POLICY "Strict update access for announcements" ON "public"."school_announcements" FOR UPDATE USING ((((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))) AND ("school_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_school_admin" = true) AND ("users"."school_id" = "school_announcements"."school_id")))))) WITH CHECK ((((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))) AND ("school_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_school_admin" = true) AND ("users"."school_id" = "school_announcements"."school_id"))))));



CREATE POLICY "Strict update access for timetables" ON "public"."school_timetables" FOR UPDATE USING ((((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))) AND ("school_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_school_admin" = true) AND ("users"."school_id" = "school_timetables"."school_id")))))) WITH CHECK ((((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))) AND ("school_id" IS NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_school_admin" = true) AND ("users"."school_id" = "school_timetables"."school_id"))))));



CREATE POLICY "Super admin all access for schools" ON "public"."schools" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."is_admin" = true) OR ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can delete own messages" ON "public"."ai_messages" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own bookmarks" ON "public"."bookmarks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own study plans" ON "public"."user_study_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own messages" ON "public"."ai_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own payments" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own quiz attempts" ON "public"."quiz_attempts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own bookmarks" ON "public"."bookmarks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own quiz results" ON "public"."quiz_results" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own study plans" ON "public"."user_study_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own study plans" ON "public"."user_study_plans" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can upsert own streak" ON "public"."user_streaks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own messages" ON "public"."ai_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own quiz attempts" ON "public"."quiz_attempts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own streak" ON "public"."user_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bookmarks" ON "public"."bookmarks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own quiz results" ON "public"."quiz_results" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own study plans" ON "public"."user_study_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users view own payments or admins view all" ON "public"."payments" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."ai_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."papers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."school_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."school_timetables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_study_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_school_admin_assignment"("target_user_id" "uuid", "target_school_id" "uuid", "new_is_school_admin" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_school_admin_assignment"("target_user_id" "uuid", "target_school_id" "uuid", "new_is_school_admin" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_school_admin_assignment"("target_user_id" "uuid", "target_school_id" "uuid", "new_is_school_admin" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_school_admin_assignment"("target_user_id" "uuid", "target_school_id" "uuid", "new_is_school_admin" boolean) TO "service_role";


















GRANT ALL ON TABLE "public"."ai_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_messages" TO "service_role";



GRANT ALL ON TABLE "public"."app_config" TO "anon";
GRANT ALL ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."app_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."app_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."app_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."flashcards" TO "anon";
GRANT ALL ON TABLE "public"."flashcards" TO "authenticated";
GRANT ALL ON TABLE "public"."flashcards" TO "service_role";



GRANT ALL ON TABLE "public"."papers" TO "anon";
GRANT ALL ON TABLE "public"."papers" TO "authenticated";
GRANT ALL ON TABLE "public"."papers" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_results" TO "anon";
GRANT ALL ON TABLE "public"."quiz_results" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_results" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."school_announcements" TO "anon";
GRANT ALL ON TABLE "public"."school_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."school_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."school_timetables" TO "anon";
GRANT ALL ON TABLE "public"."school_timetables" TO "authenticated";
GRANT ALL ON TABLE "public"."school_timetables" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "anon";
GRANT ALL ON TABLE "public"."user_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."user_study_plans" TO "anon";
GRANT ALL ON TABLE "public"."user_study_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."user_study_plans" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































