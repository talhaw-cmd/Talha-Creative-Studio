import { supabase } from '../config/supabase.js';
import { unwrap, HttpError } from './errors.js';

// Empty strings from forms become null so DB constraints (dates, uuids, emails) stay clean.
export const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]));

export async function log(req, action, entity, entityId, meta) {
  await supabase.from('activity_logs').insert({
    actor: req.user?.id, action, entity, entity_id: String(entityId ?? ''), meta: meta ?? null,
  });
}

export function escapeLike(s) {
  return s.replace(/[%_,()]/g, ' ').trim();
}

export async function mustFind(table, id, select = '*') {
  const { data, error } = await supabase.from(table).select(select).eq('id', id).maybeSingle();
  if (error) unwrap({ data, error });
  if (!data) throw new HttpError(404, 'Not found');
  return data;
}
