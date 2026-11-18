// SHARED FILE - change only via a small PR announced in the group chat.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key && !url.includes('placeholder'));

// Placeholders keep `next build` working in CI without secrets.
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder');
