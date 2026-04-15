import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback to avoid build-time crashes if environment variables are missing.
// The application will still require these variables in Vercel to function at runtime.
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://vtuujzlscnxiyxokxntk.supabase.co', 'placeholder'); // Use provided URL as default if available
