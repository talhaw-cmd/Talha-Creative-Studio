import { supabase } from '../config/supabase.js';
import { HttpError } from '../utils/errors.js';

// Verifies the Supabase access token, then confirms role = admin from the DB (never from the client).
export async function requireAdmin(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Authentication required');

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) throw new HttpError(401, 'Invalid or expired session');

    const { data: profile, error: pErr } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single();
    if (pErr || profile?.role !== 'admin') throw new HttpError(403, 'Admin access required');

    req.user = data.user;
    next();
  } catch (e) { next(e); }
}
