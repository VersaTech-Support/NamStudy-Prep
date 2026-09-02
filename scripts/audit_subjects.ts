import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''; // Usually need service role key for user edits, but assuming RLS or user management allows it, or the admin script will use a stronger key if available

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching users with legacy subjects...');
  
  // Note: auth.users metadata might not be directly queryable with anon key, but we have a public.users table?
  // Let's check if there is a public.users table with `subjects` column.
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .not('subjects', 'is', null);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No users found with legacy subjects.');
    return;
  }

  console.log(`Found ${users.length} users to migrate.`);

  // Fetch all curriculum subjects and grades
  const { data: curricula, error: currError } = await supabase
    .from('curriculum_subjects')
    .select('*, grades(name)');

  if (currError || !curricula) {
    console.error('Error fetching curriculum subjects:', currError);
    return;
  }

  for (const user of users) {
    // legacy array e.g. ['Mathematics', 'Biology']
    const legacySubjects = user.subjects || [];
    if (legacySubjects.length === 0) continue;

    console.log(`Migrating user ${user.id} (${user.email || 'unknown'}) with subjects: ${legacySubjects.join(', ')}`);

    const userGrade = user.grade_level || 'NSSCO';
    const newStudentSubjects = [];

    for (const subName of legacySubjects) {
      // Find matching curriculum subject
      const matchingSubject = curricula.find(cs => 
        cs.name === subName && 
        cs.grades?.name === userGrade
      );

      if (matchingSubject) {
        newStudentSubjects.push({
          user_id: user.id,
          curriculum_subject_id: matchingSubject.id,
          is_active: true
        });
      } else {
        // Fallback to searching without grade restriction, or default NSSCO
        const fallbackSubject = curricula.find(cs => 
          cs.name === subName && 
          cs.grades?.name === 'NSSCO'
        );
        if (fallbackSubject) {
           newStudentSubjects.push({
            user_id: user.id,
            curriculum_subject_id: fallbackSubject.id,
            is_active: true
          });
        }
      }
    }

    if (newStudentSubjects.length > 0) {
      // Insert into student_subjects
      const { error: insertError } = await supabase
        .from('student_subjects')
        .upsert(newStudentSubjects, { onConflict: 'user_id, curriculum_subject_id' });

      if (insertError) {
        console.error(`Error inserting student_subjects for user ${user.id}:`, insertError);
      } else {
        console.log(`Successfully migrated ${newStudentSubjects.length} subjects for user ${user.id}.`);
        
        // Nullify legacy subjects
        const { error: updateError } = await supabase
          .from('users')
          .update({ subjects: null })
          .eq('id', user.id);

        if (updateError) {
          console.error(`Error nullifying legacy subjects for user ${user.id}:`, updateError);
        } else {
          console.log(`Nullified legacy subjects for user ${user.id}.`);
        }
      }
    }
  }

  console.log('Audit complete.');
}

main().catch(console.error);
