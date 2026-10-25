import { ZodError } from 'zod';
import { HttpError } from '../utils/errors.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) {
    return next(new HttpError(400, 'Validation failed', parsed.error.flatten().fieldErrors));
  }
  // express 4: query is writable
  req[source] = parsed.data;
  next();
};

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { message: 'Validation failed', details: err.flatten().fieldErrors } });
  }
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: { message: status >= 500 ? 'Internal server error' : err.message, details: err.details },
  });
}

export const notFound = (_req, res) => res.status(404).json({ error: { message: 'Route not found' } });
