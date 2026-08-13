import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize database client with your real Supabase project
const supabaseUrl = 'https://yughpayxnvhbpaolddkt.supabase.co';
const supabaseKey = 'sb_publishable_vqyyZzvEEbsISiL3pPYaqA_SR3y0_-3';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { supabase };