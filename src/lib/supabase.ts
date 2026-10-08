import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://psidgcxnrvrobbdtaghs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_n4elEucVzLx47V_xfdR_7A_3IWZEhju';

export const supabase = createClient(supabaseUrl, supabaseKey);
