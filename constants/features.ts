// Central configuration for feature availability gates

export const FEATURES = {
  // ─── AI Features ──────────────────────────────────────────────────────
  // Set to true when Gemini API billing is replenished.
  // When false, NamTutor entry points display "Coming Soon" and routing is disabled.
  ENABLE_NAMTUTOR: false,

  // Gauth-style image question workflow
  ENABLE_AI_IMAGE: false,

  // AI-powered notes/PDF → flashcards/quiz/summary converter
  ENABLE_STUDY_CONVERTER: false,

  // ─── Product Features ─────────────────────────────────────────────────
  // Dark mode theme support (staged migration)
  ENABLE_DARK_MODE: true,

  // Deterministic study planner (Today's plan)
  ENABLE_STUDY_PLANNER: false,

  // Focused assessment from weak/declining topics
  ENABLE_TARGET_TEST: false,

  // Full-length mock exam experience
  ENABLE_MOCK_EXAMS: false,

  // Global search across subjects, topics, papers, quizzes
  ENABLE_GLOBAL_SEARCH: true,

  // Streaks, milestones, and learning achievements
  ENABLE_ACHIEVEMENTS: true,
};
