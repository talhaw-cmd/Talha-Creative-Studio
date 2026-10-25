import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase.js';
import { validate } from '../middleware/error.js';
import { contact, pagination } from '../validators/schemas.js';
import { wrap, unwrap, HttpError } from '../utils/errors.js';
import { escapeLike, clean } from '../utils/helpers.js';

const router = Router();

export const publicUrl = (path) =>
  path ? supabase.storage.from('public-media').getPublicUrl(path).data.publicUrl : null;

async function withCovers(rows) {
  const ids = [...new Set(rows.map((r) => r.cover_media_id).filter(Boolean))];
  if (!ids.length) return rows.map((r) => ({ ...r, cover_url: null }));
  const media = unwrap(await supabase.from('media_assets').select('id,path').in('id', ids));
  const map = Object.fromEntries(media.map((m) => [m.id, publicUrl(m.path)]));
  return rows.map((r) => ({ ...r, cover_url: map[r.cover_media_id] || null }));
}

router.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

router.get('/categories', wrap(async (_req, res) => {
  res.json({ data: unwrap(await supabase.from('categories').select('*').order('position')) });
}));

router.get('/settings', wrap(async (_req, res) => {
  res.json({ data: unwrap(await supabase.from('site_settings').select('*').eq('id', 1).single()) });
}));

router.get('/projects', validate(pagination, 'query'), wrap(async (req, res) => {
  const { page, limit, q, category, sort } = req.query;
  let query = supabase.from('projects')
    .select('id,title,slug,description,year,role,tags,featured,cover_media_id,cover_alt,cover_focal_x,cover_focal_y,published_at,position,categories(name,slug)', { count: 'exact' })
    .eq('status', 'published');

  if (category) {
    const cat = unwrap(await supabase.from('categories').select('id').eq('slug', category).maybeSingle());
    if (!cat) return res.json({ data: [], meta: { page, limit, total: 0 } });
    query = query.eq('category_id', cat.id);
  }
  if (q) {
    const s = escapeLike(q);
    if (s) query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
  }
  if (sort === 'oldest') query = query.order('published_at', { ascending: true });
  else if (sort === 'title') query = query.order('title', { ascending: true });
  else if (sort === 'position') query = query.order('position', { ascending: true });
  else query = query.order('featured', { ascending: false }).order('published_at', { ascending: false });

  const from = (page - 1) * limit;
  const { data, error, count } = await query.range(from, from + limit - 1);
  unwrap({ data, error });
  res.json({ data: await withCovers(data), meta: { page, limit, total: count ?? 0 } });
}));

router.get('/projects/:slug', wrap(async (req, res) => {
  const project = unwrap(await supabase.from('projects').select('*, categories(name,slug)')
    .eq('slug', req.params.slug).eq('status', 'published').maybeSingle());
  if (!project) throw new HttpError(404, 'Project not found');

  const blocks = unwrap(await supabase.from('project_blocks').select('id,type,content,position')
    .eq('project_id', project.id).order('position'));

  const all = unwrap(await supabase.from('projects').select('id,title,slug,category_id,cover_media_id,cover_alt,position,published_at')
    .eq('status', 'published').order('position').order('published_at', { ascending: false }));
  const idx = all.findIndex((p) => p.id === project.id);
  const prev = idx > 0 ? all[idx - 1] : all[all.length - 1];
  const next = idx < all.length - 1 ? all[idx + 1] : all[0];
  const related = all.filter((p) => p.id !== project.id && p.category_id === project.category_id).slice(0, 3);

  const [withCover] = await withCovers([project]);
  res.json({
    data: {
      ...withCover, blocks,
      prev: prev && prev.id !== project.id ? (await withCovers([prev]))[0] : null,
      next: next && next.id !== project.id ? (await withCovers([next]))[0] : null,
      related: await withCovers(related),
    },
  });
}));

router.get('/packages', wrap(async (_req, res) => {
  const rows = unwrap(await supabase.from('packages').select('*').eq('status', 'published')
    .order('featured', { ascending: false }).order('position'));
  res.json({ data: await withCovers(rows) });
}));

router.get('/packages/:slug', wrap(async (req, res) => {
  const row = unwrap(await supabase.from('packages').select('*').eq('slug', req.params.slug).eq('status', 'published').maybeSingle());
  if (!row) throw new HttpError(404, 'Package not found');
  res.json({ data: (await withCovers([row]))[0] });
}));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: { message: 'Too many submissions. Please try again later.' } },
});

router.post('/contact', contactLimiter, validate(contact), wrap(async (req, res) => {
  const { website, ...fields } = req.body; // honeypot
  unwrap(await supabase.from('contact_submissions').insert(clean(fields)));
  res.status(201).json({ data: { ok: true } });
}));

export default router;
