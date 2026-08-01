import { createClient } from '@supabase/supabase-js';

// Initialize database client with your real Supabase project
const supabaseUrl = 'https://yughpayxnvhbpaolddkt.supabase.co';
const supabaseKey = 'sb_publishable_vqyyZzvEEbsISiL3pPYaqA_SR3y0_-3';

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };