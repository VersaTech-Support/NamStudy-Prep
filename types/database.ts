export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          download_url: string
          force_update: boolean | null
          id: number
          latest_version: string
          updated_at: string | null
        }
        Insert: {
          download_url: string
          force_update?: boolean | null
          id?: number
          latest_version: string
          updated_at?: string | null
        }
        Update: {
          download_url?: string
          force_update?: boolean | null
          id?: number
          latest_version?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      curricula: {
        Row: {
          code: string
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      curriculum_subjects: {
        Row: {
          code: string | null
          color: string | null
          created_at: string | null
          description: string | null
          grade_id: string
          icon: string | null
          id: string
          name: string
          sequence_order: number | null
        }
        Insert: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          grade_id: string
          icon?: string | null
          id?: string
          name: string
          sequence_order?: number | null
        }
        Update: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          grade_id?: string
          icon?: string | null
          id?: string
          name?: string
          sequence_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_subjects_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back_content: string
          created_at: string
          front_content: string
          grade_level: string
          id: string
          subject: string
          topic_id: string | null
          topic_name: string
        }
        Insert: {
          back_content: string
          created_at?: string
          front_content: string
          grade_level: string
          id?: string
          subject: string
          topic_id?: string | null
          topic_name: string
        }
        Update: {
          back_content?: string
          created_at?: string
          front_content?: string
          grade_level?: string
          id?: string
          subject?: string
          topic_id?: string | null
          topic_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          code: string | null
          created_at: string | null
          curriculum_id: string
          id: string
          level_order: number | null
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          curriculum_id: string
          id?: string
          level_order?: number | null
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          curriculum_id?: string
          id?: string
          level_order?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          created_at: string | null
          description: string | null
          grade_level: string
          id: string
          paper_number: number
          paper_pdf_url: string
          solution_pdf_url: string | null
          subject: string | null
          title: string
          year: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          grade_level: string
          id?: string
          paper_number: number
          paper_pdf_url: string
          solution_pdf_url?: string | null
          subject?: string | null
          title: string
          year: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          grade_level?: string
          id?: string
          paper_number?: number
          paper_pdf_url?: string
          solution_pdf_url?: string | null
          subject?: string | null
          title?: string
          year?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_note: string | null
          amount: number
          bank_name: string
          created_at: string | null
          currency: string | null
          id: string
          plan_type: string | null
          reference_number: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_name: string
          created_at?: string | null
          currency?: string | null
          id?: string
          plan_type?: string | null
          reference_number: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_name?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          plan_type?: string | null
          reference_number?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          created_at: string
          grade_level: string
          id: string
          percentage: number
          score: number
          subject: string
          topic_id: string | null
          topic_name: string
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          grade_level: string
          id?: string
          percentage: number
          score: number
          subject: string
          topic_id?: string | null
          topic_name: string
          total_questions: number
          user_id: string
        }
        Update: {
          created_at?: string
          grade_level?: string
          id?: string
          percentage?: number
          score?: number
          subject?: string
          topic_id?: string | null
          topic_name?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          created_at: string
          grade_level: string
          id: string
          score: number
          topic_id: string | null
          topic_name: string
          total_questions: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          grade_level: string
          id?: string
          score: number
          topic_id?: string | null
          topic_name: string
          total_questions: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          grade_level?: string
          id?: string
          score?: number
          topic_id?: string | null
          topic_name?: string
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          correct_answer: string
          difficulty: string | null
          explanation_text: string | null
          grade_level: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          subject: string | null
          topic_id: string | null
          topic_name: string
        }
        Insert: {
          correct_answer: string
          difficulty?: string | null
          explanation_text?: string | null
          grade_level: string
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          subject?: string | null
          topic_id?: string | null
          topic_name: string
        }
        Update: {
          correct_answer?: string
          difficulty?: string | null
          explanation_text?: string | null
          grade_level?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          subject?: string | null
          topic_id?: string | null
          topic_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          is_urgent: boolean | null
          school_id: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          school_id?: string | null
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          school_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_timetables: {
        Row: {
          created_at: string | null
          curriculum: string | null
          duration: string | null
          exam_date: string | null
          id: string
          paper_code: string | null
          school_id: string | null
          start_time: string | null
          subject_name: string | null
          venue: string | null
        }
        Insert: {
          created_at?: string | null
          curriculum?: string | null
          duration?: string | null
          exam_date?: string | null
          id?: string
          paper_code?: string | null
          school_id?: string | null
          start_time?: string | null
          subject_name?: string | null
          venue?: string | null
        }
        Update: {
          created_at?: string | null
          curriculum?: string | null
          duration?: string | null
          exam_date?: string | null
          id?: string
          paper_code?: string | null
          school_id?: string | null
          start_time?: string | null
          subject_name?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_timetables_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          accent_color: string | null
          code: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
        }
        Insert: {
          accent_color?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
        }
        Update: {
          accent_color?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
        }
        Relationships: []
      }
      student_content_progress: {
        Row: {
          completed_at: string | null
          content_block_id: string | null
          created_at: string | null
          id: string
          last_seen_at: string | null
          last_viewed_at: string | null
          progress_percent: number
          started_at: string | null
          topic_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_block_id?: string | null
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          last_viewed_at?: string | null
          progress_percent?: number
          started_at?: string | null
          topic_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_block_id?: string | null
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          last_viewed_at?: string | null
          progress_percent?: number
          started_at?: string | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_content_progress_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "topic_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_content_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subjects: {
        Row: {
          created_at: string | null
          curriculum_subject_id: string
          exam_date: string | null
          id: string
          is_active: boolean | null
          target_grade: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          curriculum_subject_id: string
          exam_date?: string | null
          id?: string
          is_active?: boolean | null
          target_grade?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          curriculum_subject_id?: string
          exam_date?: string | null
          id?: string
          is_active?: boolean | null
          target_grade?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_curriculum_subject_id_fkey"
            columns: ["curriculum_subject_id"]
            isOneToOne: false
            referencedRelation: "curriculum_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_topic_confidence: {
        Row: {
          confidence: string
          created_at: string | null
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          confidence: string
          created_at?: string | null
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          confidence?: string
          created_at?: string | null
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_confidence_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_topic_progress: {
        Row: {
          completed_at: string | null
          completion_percent: number | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          last_content_block_id: string | null
          started_at: string | null
          time_spent_seconds: number | null
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percent?: number | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          last_content_block_id?: string | null
          started_at?: string | null
          time_spent_seconds?: number | null
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percent?: number | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          last_content_block_id?: string | null
          started_at?: string | null
          time_spent_seconds?: number | null
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_progress_last_content_block_id_fkey"
            columns: ["last_content_block_id"]
            isOneToOne: false
            referencedRelation: "topic_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      topic_content: {
        Row: {
          block_type: string
          content: Json
          created_at: string | null
          id: string
          is_published: boolean | null
          is_required: boolean | null
          sequence_order: number
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          is_required?: boolean | null
          sequence_order?: number
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          is_required?: boolean | null
          sequence_order?: number
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_content_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_sections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sequence_order: number | null
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sequence_order?: number | null
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sequence_order?: number | null
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_sections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "curriculum_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_minutes: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          publication_status: string | null
          section_id: string | null
          sequence_order: number | null
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          publication_status?: string | null
          section_id?: string | null
          sequence_order?: number | null
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          publication_status?: string | null
          section_id?: string | null
          sequence_order?: number | null
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "topic_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "curriculum_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_active_date: string
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_active_date?: string
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_active_date?: string
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_study_plans: {
        Row: {
          created_at: string | null
          id: string
          plan_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_data: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_study_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          expiry_date: string | null
          grade_level: string
          id: string
          is_admin: boolean | null
          is_school_admin: boolean | null
          name: string
          role: string | null
          school: string | null
          school_id: string | null
          school_locked: boolean | null
          subjects: string[] | null
          subscription_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          expiry_date?: string | null
          grade_level: string
          id?: string
          is_admin?: boolean | null
          is_school_admin?: boolean | null
          name: string
          role?: string | null
          school?: string | null
          school_id?: string | null
          school_locked?: boolean | null
          subjects?: string[] | null
          subscription_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          expiry_date?: string | null
          grade_level?: string
          id?: string
          is_admin?: boolean | null
          is_school_admin?: boolean | null
          name?: string
          role?: string | null
          school?: string | null
          school_id?: string | null
          school_locked?: boolean | null
          subjects?: string[] | null
          subscription_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      set_school_admin_assignment: {
        Args: {
          new_is_school_admin: boolean
          target_school_id: string
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
