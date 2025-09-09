import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = typeof window !== 'undefined' 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL;

const supabaseAnonKey = typeof window !== 'undefined'
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);