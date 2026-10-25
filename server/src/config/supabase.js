import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Service-role client: trusted server only, bypasses RLS. Authorization is enforced in middleware.
export const supabase = createClient(env.supabaseUrl || 'http://localhost', env.serviceKey || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
});
