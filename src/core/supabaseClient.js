import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const normalizedUrl = rawSupabaseUrl?.trim().replace(/\/+$/, '');
const hasSupabaseConfig = Boolean(normalizedUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.error('Missing Supabase environment variables.');
}

const supabase = createClient(normalizedUrl || '', supabaseAnonKey || '');

export { supabase, hasSupabaseConfig };
