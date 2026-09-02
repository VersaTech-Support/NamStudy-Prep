import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: curricula } = await supabase.from('curricula').select('*');
  console.log('--- CURRICULA ---');
  console.log(JSON.stringify(curricula, null, 2));

  const { data: grades } = await supabase.from('grades').select('*, curricula(name)');
  console.log('--- GRADES ---');
  console.log(JSON.stringify(grades, null, 2));
}

main().catch(console.error);
