import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Clean URL: remove spaces, outer quotes, and ensure http/https prefix
const cleanSupabaseUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.trim().replace(/^['"]|['"]$/g, '');
  // Ignore boilerplate placeholders
  if (cleaned.includes('tu_supabase_project_url') || cleaned.includes('placeholder-project')) {
    return '';
  }
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
};

// Clean Key: remove spaces and outer quotes
const cleanSupabaseKey = (key: string): string => {
  if (!key) return '';
  let cleaned = key.trim().replace(/^['"]|['"]$/g, '');
  if (cleaned.includes('tu_supabase_anon_key') || cleaned.includes('placeholder-anon-key')) {
    return '';
  }
  return cleaned;
};

const supabaseUrl = cleanSupabaseUrl(rawUrl);
const supabaseAnonKey = cleanSupabaseKey(rawKey);

// Stricter URL validation helper to prevent malformed URLs from crashing the client
const isValidSupabaseUrl = (urlStr: string): boolean => {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname.includes('.') &&
      parsed.hostname.length > 4
    );
  } catch {
    return false;
  }
};

// It is configured if we have a valid-looking URL and key after cleaning
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  isValidSupabaseUrl(supabaseUrl)
);

const finalUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(finalUrl, finalKey);
