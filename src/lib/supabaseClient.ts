import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate URL format to prevent Supabase JS SDK crashes
const isValidUrl = (url: string) => {
  try {
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

const safeUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-anon-key';

if (!isValidUrl(supabaseUrl)) {
  console.warn(
    'Supabase URL is missing or invalid. Please add your NEXT_PUBLIC_SUPABASE_URL in your .env.local file.'
  );
}

export const supabase = createClient(safeUrl, safeKey);

