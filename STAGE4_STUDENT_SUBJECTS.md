# Stage 4: Student Subject Experience + Rich Notes Reader

## Overview
Stage 4 completes the core student-facing curriculum experience. It introduces personalized subject enrollment, a hierarchical subject dashboard, and a rich, interactive notes reader. This layer bridges the gap between the administrative curriculum management (built in previous stages) and the student's personalized learning journey.

## Key Features

### 1. Subject Enrollment (`student_subjects`)
- **Table**: `student_subjects` tracks a student's enrollment in a subject, their target grade, and their exam date.
- **UI**: Added a dynamic "Your Subjects" section to the Home Screen (`app/(tabs)/index.tsx`).
- **Interaction**: Students can browse available curriculum subjects and add them to their profile via the new `SubjectSelectionModal`.

### 2. Student Subject Dashboard (`app/subject/[id].tsx`)
- **Hierarchy Mapping**: Reuses the existing `curriculum_subjects -> topic_sections -> topics` hierarchy to present a structured view of the subject.
- **Mastery Integration**: Connects the global topic mastery data (`SubjectMastery`) to visual progress bars on the subject dashboard.
- **Navigation**: Acts as the central hub for a subject, allowing students to drill down into specific topic sections and individual topics.

### 3. Topic Hub Integration (`app/topic/[id].tsx`)
- **Link**: Added a prominent "Revision Notes" action card to the Topic Hub study tools grid.
- **Context**: Maintains the existing Topic Hub architecture (Flashcards, Quizzes, Past Papers) while seamlessly integrating the new Notes feature.

### 4. Rich Notes Reader (`app/topic/[id]/notes.tsx`)
- **Rendering**: Leverages the existing `BlockRenderer` to present rich, formatted curriculum content (`topic_content` blocks).
- **Publication Control**: Strictly filters both topics and content blocks by their `is_published` / `publication_status` flags.
- **Progress Tracking**: 
  - Computes a dynamic read percentage based on the user's scroll position.
  - Updates the new `student_content_progress` table using a debounced mechanism to avoid excessive database writes.
  - Automatically marks the topic as 100% complete when the user reaches the bottom of the document.

## Database Additions

**Migration `20260824122519_stage4_student_subjects.sql`**:
- `student_subjects`: Tracks subject enrollments.
- `student_content_progress`: Tracks read progress on specific topics.
- **RLS Policies**: Full row-level security ensuring students can only insert, select, and update their own rows, while admins have global read access.

**Migration `20260824125604_stage4_content_progress_fix.sql`**:
- Applies a schema patch to add `progress_percent` and `last_viewed_at` if the `student_content_progress` table was previously created with legacy columns.

## Testing & Compilation
- Full TypeScript compiler checks pass with 0 errors (`npx tsc --noEmit`).
- Safe optional chaining and type casting applied for Supabase queries and Expo routing.

## Next Steps
- Verify the end-to-end user flow from subject enrollment to 100% completion of a notes topic.
- Begin Stage 5 (NamTutor architecture integration) once the Notes reading experience is fully validated.
