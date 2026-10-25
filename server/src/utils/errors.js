export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Convert a Supabase/Postgres error into an HttpError
export function dbError(error) {
  if (!error) return null;
  if (error.code === '23505') return new HttpError(409, 'A record with that unique value already exists');
  if (error.code === '23503') return new HttpError(409, 'This record is linked to other data and cannot be changed this way');
  if (error.code === '23514' || error.code === '22P02') return new HttpError(400, 'Invalid value supplied');
  if (error.code === 'PGRST116') return new HttpError(404, 'Not found');
  return new HttpError(500, 'Database error');
}
export function unwrap({ data, error }) {
  const e = dbError(error);
  if (e) { console.error('[db]', error.message); throw e; }
  return data;
}
