import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yughpayxnvhbpaolddkt.supabase.co';
const supabaseKey = 'sb_publishable_vqyyZzvEEbsISiL3pPYaqA_SR3y0_-3';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPapers() {
  const { data, error } = await supabase.from('papers').select('*');
  if (error) {
    console.error('Error fetching papers:', error);
    return;
  }

  const papers = data || [];
  
  const gradeLevels = new Set<string>();
  const subjects = new Set<string>();
  const years = new Set<number>();
  const paperNumbers = new Set<number>();
  
  let stringYears = 0;
  let stringPaperNumbers = 0;
  
  for (const p of papers) {
    if (p.grade_level) gradeLevels.add(p.grade_level);
    if (p.subject) subjects.add(p.subject);
    if (p.year !== undefined && p.year !== null) {
        years.add(p.year);
        if (typeof p.year === 'string') stringYears++;
    }
    if (p.paper_number !== undefined && p.paper_number !== null) {
        paperNumbers.add(p.paper_number);
        if (typeof p.paper_number === 'string') stringPaperNumbers++;
    }
  }

  console.log('--- Papers Metadata Diagnosis ---');
  console.log(`Total papers: ${papers.length}`);
  console.log('\nGrade Levels:', Array.from(gradeLevels));
  console.log('\nSubjects:', Array.from(subjects));
  console.log('\nYears:', Array.from(years).sort((a,b)=>Number(b)-Number(a)));
  console.log(`Years stored as string: ${stringYears}`);
  console.log('\nPaper Numbers:', Array.from(paperNumbers).sort((a,b)=>Number(a)-Number(b)));
  console.log(`Paper Numbers stored as string: ${stringPaperNumbers}`);
}

inspectPapers();
