import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { supabase } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/error.js';
import * as S from '../validators/schemas.js';
import { wrap, unwrap, HttpError } from '../utils/errors.js';
import { clean, log, mustFind, escapeLike } from '../utils/helpers.js';
import { publicUrl } from './public.js';

const router = Router();
router.use(requireAdmin);

const MAX_MEDIA = 20 * 1024 * 1024;
const MAX_PRIVATE = 50 * 1024 * 1024;
const upload = (limit) => multer({ storage: multer.memoryStorage(), limits: { fileSize: limit, files: 1 } });

// ---- upload safety: allow-listed MIME + magic-byte sniffing (never trust extension alone)
const MEDIA_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/gif': ['.gif'],
  'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'application/pdf': ['.pdf'],
};
const PRIVATE_EXTRA = {
  'application/zip': ['.zip'], 'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/postscript': ['.ai', '.eps'], 'image/vnd.adobe.photoshop': ['.psd'],
};
function sniff(buf, mime) {
  const h = (hex) => buf.subarray(0, hex.length / 2).toString('hex') === hex;
  switch (mime) {
    case 'image/jpeg': return h('ffd8ff');
    case 'image/png': return h('89504e47');
    case 'image/gif': return h('47494638');
    case 'image/webp': return buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
    case 'application/pdf': return buf.subarray(0, 5).toString() === '%PDF-';
    case 'video/mp4': return buf.subarray(4, 8).toString() === 'ftyp';
    case 'video/webm': return h('1a45dfa3');
    case 'application/zip': case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': return h('504b0304');
    default: return true; // text/legacy formats: allow-listed only
  }
}
function checkFile(file, allowed) {
  if (!file) throw new HttpError(400, 'No file uploaded');
  const exts = allowed[file.mimetype];
  if (!exts) throw new HttpError(415, `File type ${file.mimetype} is not allowed`);
  const ext = path.extname(file.originalname).toLowerCase();
  if (!exts.includes(ext)) throw new HttpError(415, 'File extension does not match its type');
  if (!sniff(file.buffer, file.mimetype)) throw new HttpError(415, 'File content does not match its type');
  return ext;
}
const safeName = (n) => path.basename(n).replace(/[^\w.\- ]+/g, '_').slice(0, 150);
const pageRange = (page, limit) => [(page - 1) * limit, (page - 1) * limit + limit - 1];

// ===================== DASHBOARD =====================
router.get('/dashboard', wrap(async (_req, res) => {
  const count = async (table, f) => {
    let q = supabase.from(table).select('id', { count: 'exact', head: true });
    if (f) q = f(q);
    const { count: c, error } = await q; unwrap({ data: 1, error }); return c ?? 0;
  };
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const [published, drafts, packages, newEnquiries, activeWork] = await Promise.all([
    count('projects', (q) => q.eq('status', 'published')),
    count('projects', (q) => q.eq('status', 'draft')),
    count('packages', (q) => q.eq('status', 'published')),
    count('contact_submissions', (q) => q.eq('status', 'new')),
    count('client_projects', (q) => q.in('status', ['brief', 'in_progress', 'review', 'revisions'])),
  ]);
  const invoices = unwrap(await supabase.from('invoice_summary').select('invoice_number,currency,outstanding,status,due_date,id'));
  const open = invoices.filter((i) => ['unpaid', 'partially_paid', 'overdue'].includes(i.status));
  const outstanding = {};
  open.forEach((i) => { outstanding[i.currency] = (outstanding[i.currency] || 0) + Number(i.outstanding); });
  const deadlines = unwrap(await supabase.from('client_projects').select('id,title,deadline,status,clients(name)')
    .in('status', ['brief', 'in_progress', 'review', 'revisions']).not('deadline', 'is', null)
    .lte('deadline', soon).order('deadline').limit(8));
  const activity = unwrap(await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(10));
  res.json({
    data: {
      projects: { published, drafts }, packages, newEnquiries, activeWork,
      unpaidInvoices: open.length, overdueInvoices: open.filter((i) => i.status === 'overdue').length,
      outstanding, deadlines: deadlines.map((d) => ({ ...d, overdue: d.deadline < today })), activity,
    },
  });
}));

// ===================== CATEGORIES =====================
router.get('/categories', wrap(async (_req, res) => {
  res.json({ data: unwrap(await supabase.from('categories').select('*').order('position')) });
}));
router.post('/categories', validate(S.category), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('categories').insert(req.body).select().single());
  await log(req, 'create', 'category', row.id); res.status(201).json({ data: row });
}));
router.patch('/categories/:id', validate(S.category.partial()), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('categories').update(req.body).eq('id', req.params.id).select().single());
  res.json({ data: row });
}));
router.delete('/categories/:id', wrap(async (req, res) => {
  unwrap(await supabase.from('categories').delete().eq('id', req.params.id)); // projects keep, category set null
  await log(req, 'delete', 'category', req.params.id); res.json({ data: { ok: true } });
}));

// ===================== PROJECTS =====================
router.get('/projects', validate(S.pagination, 'query'), wrap(async (req, res) => {
  const { page, limit, q, status } = req.query;
  let query = supabase.from('projects').select('*, categories(name,slug)', { count: 'exact' });
  if (status && ['draft', 'published', 'archived'].includes(status)) query = query.eq('status', status);
  else query = query.neq('status', 'archived');
  if (q) { const s = escapeLike(q); if (s) query = query.or(`title.ilike.%${s}%,slug.ilike.%${s}%`); }
  const [a, b] = pageRange(page, limit);
  const { data, error, count } = await query.order('position').order('updated_at', { ascending: false }).range(a, b);
  unwrap({ data, error });
  res.json({ data, meta: { page, limit, total: count ?? 0 } });
}));

router.post('/projects', validate(S.project), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('projects').insert(clean(req.body)).select().single());
  await log(req, 'create', 'project', row.id, { title: row.title });
  res.status(201).json({ data: row });
}));

router.get('/projects/:id', wrap(async (req, res) => {
  const project = await mustFind('projects', req.params.id, '*, categories(name,slug)');
  const blocks = unwrap(await supabase.from('project_blocks').select('*').eq('project_id', project.id).order('position'));
  let cover_url = null;
  if (project.cover_media_id) {
    const m = await supabase.from('media_assets').select('path').eq('id', project.cover_media_id).maybeSingle();
    cover_url = publicUrl(m.data?.path);
  }
  res.json({ data: { ...project, cover_url, blocks } });
}));

router.patch('/projects/:id', validate(S.projectUpdate), wrap(async (req, res) => {
  const current = await mustFind('projects', req.params.id, 'id,status,cover_media_id,cover_alt');
  const next = { ...clean(req.body) };
  // cover rule: a published project must have a cover with alt text
  const cover = next.cover_media_id !== undefined ? next.cover_media_id : current.cover_media_id;
  const alt = next.cover_alt !== undefined ? next.cover_alt : current.cover_alt;
  if (current.status === 'published' && (!cover || !alt)) throw new HttpError(400, 'Published projects need a cover image with alt text');
  const row = unwrap(await supabase.from('projects').update(next).eq('id', req.params.id).select().single());
  await log(req, 'update', 'project', row.id);
  res.json({ data: row });
}));

router.post('/projects/:id/publish', validate(S.publishToggle), wrap(async (req, res) => {
  const p = await mustFind('projects', req.params.id);
  if (req.body.publish) {
    if (!p.cover_media_id) throw new HttpError(400, 'Add a cover image before publishing');
    if (!p.cover_alt?.trim()) throw new HttpError(400, 'Add alt text for the cover image before publishing');
  }
  const row = unwrap(await supabase.from('projects').update({
    status: req.body.publish ? 'published' : 'draft',
    published_at: req.body.publish ? (p.published_at || new Date().toISOString()) : p.published_at,
  }).eq('id', p.id).select().single());
  await log(req, req.body.publish ? 'publish' : 'unpublish', 'project', p.id);
  res.json({ data: row });
}));

router.post('/projects/:id/archive', wrap(async (req, res) => {
  const row = unwrap(await supabase.from('projects').update({ status: 'archived' }).eq('id', req.params.id).select().single());
  await log(req, 'archive', 'project', row.id); res.json({ data: row });
}));

router.delete('/projects/:id', wrap(async (req, res) => {
  // Soft-delete: archive. Media files are never removed with a project.
  const row = unwrap(await supabase.from('projects').update({ status: 'archived' }).eq('id', req.params.id).select().single());
  await log(req, 'archive', 'project', row.id); res.json({ data: row });
}));

router.post('/projects/:id/duplicate', wrap(async (req, res) => {
  const p = await mustFind('projects', req.params.id);
  const { id, created_at, updated_at, published_at, ...rest } = p;
  const suffix = crypto.randomBytes(2).toString('hex');
  const copy = unwrap(await supabase.from('projects').insert({
    ...rest, title: `${p.title} (copy)`, slug: `${p.slug}-copy-${suffix}`.slice(0, 120), status: 'draft', featured: false,
  }).select().single());
  const blocks = unwrap(await supabase.from('project_blocks').select('type,content,position').eq('project_id', p.id));
  if (blocks.length) unwrap(await supabase.from('project_blocks').insert(blocks.map((b) => ({ ...b, project_id: copy.id }))));
  await log(req, 'duplicate', 'project', copy.id, { from: p.id });
  res.status(201).json({ data: copy });
}));

router.put('/projects/reorder', validate(S.projectOrder), wrap(async (req, res) => {
  await Promise.all(req.body.ids.map((id, i) => supabase.from('projects').update({ position: i }).eq('id', id)));
  res.json({ data: { ok: true } });
}));

// Replace all blocks atomically-ish (delete + insert); order is the array order.
router.put('/projects/:id/blocks', validate(S.blocksReplace), wrap(async (req, res) => {
  await mustFind('projects', req.params.id, 'id');
  const old = unwrap(await supabase.from('project_blocks').select('*').eq('project_id', req.params.id));
  unwrap(await supabase.from('project_blocks').delete().eq('project_id', req.params.id));
  const rows = req.body.blocks.map((b, i) => ({ project_id: req.params.id, type: b.type, content: b.content, position: i }));
  if (rows.length) {
    const r = await supabase.from('project_blocks').insert(rows);
    if (r.error) { // roll back
      if (old.length) await supabase.from('project_blocks').insert(old);
      unwrap(r);
    }
  }
  await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id);
  res.json({ data: { ok: true, count: rows.length } });
}));

// ===================== PACKAGES =====================
router.get('/packages', wrap(async (req, res) => {
  let q = supabase.from('packages').select('*').order('position');
  if (req.query.status) q = q.eq('status', String(req.query.status)); else q = q.neq('status', 'archived');
  res.json({ data: unwrap(await q) });
}));
router.post('/packages', validate(S.packageSchema), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('packages').insert(clean(req.body)).select().single());
  await log(req, 'create', 'package', row.id); res.status(201).json({ data: row });
}));
router.get('/packages/:id', wrap(async (req, res) => res.json({ data: await mustFind('packages', req.params.id) })));
router.patch('/packages/:id', validate(S.packageUpdate), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('packages').update(clean(req.body)).eq('id', req.params.id).select().single());
  await log(req, 'update', 'package', row.id); res.json({ data: row });
}));
router.post('/packages/:id/publish', validate(S.publishToggle), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('packages').update({ status: req.body.publish ? 'published' : 'draft' }).eq('id', req.params.id).select().single());
  await log(req, req.body.publish ? 'publish' : 'unpublish', 'package', row.id); res.json({ data: row });
}));
router.delete('/packages/:id', wrap(async (req, res) => {
  const row = unwrap(await supabase.from('packages').update({ status: 'archived' }).eq('id', req.params.id).select().single());
  await log(req, 'archive', 'package', row.id); res.json({ data: row });
}));

// ===================== MEDIA =====================
router.get('/media', validate(S.pagination, 'query'), wrap(async (req, res) => {
  const { page, limit, q } = req.query;
  let query = supabase.from('media_assets').select('*', { count: 'exact' }).eq('bucket', 'public-media');
  if (q) { const s = escapeLike(q); if (s) query = query.or(`file_name.ilike.%${s}%,alt_text.ilike.%${s}%,caption.ilike.%${s}%`); }
  if (req.query.type === 'image') query = query.like('mime_type', 'image/%');
  const [a, b] = pageRange(page, limit);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(a, b);
  unwrap({ data, error });
  res.json({ data: data.map((m) => ({ ...m, url: publicUrl(m.path) })), meta: { page, limit, total: count ?? 0 } });
}));

router.post('/media', upload(MAX_MEDIA).single('file'), wrap(async (req, res) => {
  const ext = checkFile(req.file, MEDIA_TYPES);
  // content-addressed path: uploading the same file twice reuses the existing asset
  const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex').slice(0, 32);
  const storagePath = `${hash}${ext}`;
  const existing = (await supabase.from('media_assets').select('*').eq('bucket', 'public-media').eq('path', storagePath).maybeSingle()).data;
  if (existing) return res.json({ data: { ...existing, url: publicUrl(existing.path) }, meta: { reused: true } });

  const up = await supabase.storage.from('public-media').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
  if (up.error && !/exists/i.test(up.error.message)) { console.error(up.error); throw new HttpError(502, 'Storage upload failed'); }
  const row = unwrap(await supabase.from('media_assets').insert({
    bucket: 'public-media', path: storagePath, file_name: safeName(req.file.originalname),
    mime_type: req.file.mimetype, size_bytes: req.file.size,
    alt_text: req.body.alt_text?.slice(0, 300) || null, caption: req.body.caption?.slice(0, 500) || null,
  }).select().single());
  await log(req, 'upload', 'media', row.id);
  res.status(201).json({ data: { ...row, url: publicUrl(row.path) } });
}));

router.patch('/media/:id', validate(S.mediaUpdate), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('media_assets').update(req.body).eq('id', req.params.id).select().single());
  res.json({ data: { ...row, url: publicUrl(row.path) } });
}));

router.delete('/media/:id', wrap(async (req, res) => {
  const m = await mustFind('media_assets', req.params.id);
  // never delete media still used by any project/package/block
  const [proj, pkg, blocks] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('cover_media_id', m.id),
    supabase.from('packages').select('id', { count: 'exact', head: true }).eq('cover_media_id', m.id),
    supabase.from('project_blocks').select('content'),
  ]);
  unwrap(blocks);
  const inBlocks = blocks.data.filter((b) => JSON.stringify(b.content).includes(m.path)).length;
  const used = (proj.count || 0) + (pkg.count || 0) + inBlocks;
  if (used > 0) throw new HttpError(409, `This file is used in ${used} place(s). Remove it from them first.`);
  await supabase.storage.from('public-media').remove([m.path]);
  unwrap(await supabase.from('media_assets').delete().eq('id', m.id));
  await log(req, 'delete', 'media', m.id);
  res.json({ data: { ok: true } });
}));

// ===================== CLIENTS =====================
router.get('/clients', validate(S.pagination, 'query'), wrap(async (req, res) => {
  const { page, limit, q } = req.query;
  let query = supabase.from('clients').select('*, client_projects(id)', { count: 'exact' });
  query = req.query.archived === 'true' ? query.eq('archived', true) : query.eq('archived', false);
  if (q) { const s = escapeLike(q); if (s) query = query.or(`name.ilike.%${s}%,company.ilike.%${s}%,email.ilike.%${s}%`); }
  const [a, b] = pageRange(page, limit);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(a, b);
  unwrap({ data, error });
  res.json({ data: data.map(({ client_projects, ...c }) => ({ ...c, project_count: client_projects.length })), meta: { page, limit, total: count ?? 0 } });
}));
router.post('/clients', validate(S.client), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('clients').insert(clean(req.body)).select().single());
  await log(req, 'create', 'client', row.id); res.status(201).json({ data: row });
}));
router.get('/clients/:id', wrap(async (req, res) => {
  const c = await mustFind('clients', req.params.id);
  const projects = unwrap(await supabase.from('client_projects').select('*').eq('client_id', c.id).order('created_at', { ascending: false }));
  res.json({ data: { ...c, projects } });
}));
router.patch('/clients/:id', validate(S.clientUpdate), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('clients').update(clean(req.body)).eq('id', req.params.id).select().single());
  await log(req, 'update', 'client', row.id); res.json({ data: row });
}));
router.delete('/clients/:id', wrap(async (req, res) => {
  const { count } = await supabase.from('client_projects').select('id', { count: 'exact', head: true }).eq('client_id', req.params.id);
  if (count > 0) { // keep history: archive instead of deleting
    unwrap(await supabase.from('clients').update({ archived: true }).eq('id', req.params.id));
    await log(req, 'archive', 'client', req.params.id);
    return res.json({ data: { ok: true, archived: true } });
  }
  unwrap(await supabase.from('clients').delete().eq('id', req.params.id));
  await log(req, 'delete', 'client', req.params.id); res.json({ data: { ok: true, archived: false } });
}));

// ===================== CLIENT PROJECTS =====================
router.get('/client-projects', validate(S.pagination, 'query'), wrap(async (req, res) => {
  const { page, limit, q, status } = req.query;
  let query = supabase.from('client_projects').select('*, clients(id,name,company)', { count: 'exact' });
  if (status) query = query.eq('status', status);
  if (req.query.client_id) query = query.eq('client_id', String(req.query.client_id));
  if (q) { const s = escapeLike(q); if (s) query = query.ilike('title', `%${s}%`); }
  const [a, b] = pageRange(page, limit);
  const { data, error, count } = await query.order('deadline', { ascending: true, nullsFirst: false }).range(a, b);
  unwrap({ data, error });
  res.json({ data, meta: { page, limit, total: count ?? 0 } });
}));
router.post('/client-projects', validate(S.clientProject), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('client_projects').insert(clean(req.body)).select().single());
  await log(req, 'create', 'client_project', row.id); res.status(201).json({ data: row });
}));
router.get('/client-projects/:id', wrap(async (req, res) => {
  const p = await mustFind('client_projects', req.params.id, '*, clients(id,name,email,company)');
  const files = unwrap(await supabase.from('project_files').select('*').eq('client_project_id', p.id).order('created_at', { ascending: false }));
  const invoices = unwrap(await supabase.from('invoice_summary').select('*').eq('client_project_id', p.id).order('created_at', { ascending: false }));
  res.json({ data: { ...p, files, invoices } });
}));
router.patch('/client-projects/:id', validate(S.clientProjectUpdate), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('client_projects').update(clean(req.body)).eq('id', req.params.id).select().single());
  await log(req, 'update', 'client_project', row.id); res.json({ data: row });
}));
router.delete('/client-projects/:id', wrap(async (req, res) => {
  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('client_project_id', req.params.id);
  if (count > 0) throw new HttpError(409, 'This project has invoices. Set its status to Cancelled instead of deleting.');
  const files = unwrap(await supabase.from('project_files').select('storage_path').eq('client_project_id', req.params.id));
  if (files.length) await supabase.storage.from('private-files').remove(files.map((f) => f.storage_path));
  unwrap(await supabase.from('client_projects').delete().eq('id', req.params.id));
  await log(req, 'delete', 'client_project', req.params.id); res.json({ data: { ok: true } });
}));

// ===================== PRIVATE FILES =====================
router.post('/files', upload(MAX_PRIVATE).single('file'), wrap(async (req, res) => {
  const meta = S.fileRecord.parse(req.body);
  await mustFind('client_projects', meta.client_project_id, 'id');
  const ext = checkFile(req.file, { ...MEDIA_TYPES, ...PRIVATE_EXTRA });
  const storagePath = `${meta.client_project_id}/${crypto.randomUUID()}${ext}`;
  const up = await supabase.storage.from('private-files').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });
  if (up.error) { console.error(up.error); throw new HttpError(502, 'Storage upload failed'); }
  const row = unwrap(await supabase.from('project_files').insert({
    ...meta, file_name: safeName(req.file.originalname), storage_path: storagePath,
    mime_type: req.file.mimetype, size_bytes: req.file.size,
  }).select().single());
  await log(req, 'upload', 'file', row.id);
  res.status(201).json({ data: row });
}));
router.get('/files', wrap(async (req, res) => {
  const id = z_uuid(req.query.client_project_id);
  res.json({ data: unwrap(await supabase.from('project_files').select('*').eq('client_project_id', id).order('created_at', { ascending: false })) });
}));
router.get('/files/:id/download', wrap(async (req, res) => {
  const f = await mustFind('project_files', req.params.id);
  const { data, error } = await supabase.storage.from('private-files').createSignedUrl(f.storage_path, 60, { download: f.file_name });
  if (error) throw new HttpError(502, 'Could not create download link');
  res.json({ data: { url: data.signedUrl, expires_in: 60 } }); // short-lived
}));
router.delete('/files/:id', wrap(async (req, res) => {
  const f = await mustFind('project_files', req.params.id);
  await supabase.storage.from('private-files').remove([f.storage_path]);
  unwrap(await supabase.from('project_files').delete().eq('id', f.id));
  await log(req, 'delete', 'file', f.id); res.json({ data: { ok: true } });
}));
function z_uuid(v) {
  if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) throw new HttpError(400, 'client_project_id is required');
  return v;
}

// ===================== INVOICES =====================
// invoice_summary is a view, so related project/client names are attached in a second query.
async function attachProjects(rows) {
  const ids = [...new Set(rows.map((r) => r.client_project_id))];
  if (!ids.length) return rows;
  const cps = unwrap(await supabase.from('client_projects').select('id,title,clients(name,email)').in('id', ids));
  const map = Object.fromEntries(cps.map((c) => [c.id, c]));
  return rows.map((r) => ({ ...r, client_project: map[r.client_project_id] || null }));
}
router.get('/invoices', validate(S.pagination, 'query'), wrap(async (req, res) => {
  const { page, limit, q, status } = req.query;
  let query = supabase.from('invoice_summary').select('*', { count: 'exact' });
  if (status) query = query.eq('status', status);
  if (q) { const s = escapeLike(q); if (s) query = query.ilike('invoice_number', `%${s}%`); }
  const [a, b] = pageRange(page, limit);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(a, b);
  unwrap({ data, error });
  res.json({ data: await attachProjects(data), meta: { page, limit, total: count ?? 0 } });
}));
router.post('/invoices', validate(S.invoice), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('invoices').insert(clean(req.body)).select().single());
  await log(req, 'create', 'invoice', row.id, { number: row.invoice_number }); res.status(201).json({ data: row });
}));
router.get('/invoices/:id', wrap(async (req, res) => {
  const inv = await mustFind('invoice_summary', req.params.id);
  const payments = unwrap(await supabase.from('invoice_payments').select('*').eq('invoice_id', inv.id).order('paid_on'));
  res.json({ data: { ...(await attachProjects([inv]))[0], payments } });
}));
router.patch('/invoices/:id', validate(S.invoiceUpdate), wrap(async (req, res) => {
  const cur = await mustFind('invoice_summary', req.params.id);
  const patch = clean(req.body);
  // balances/status are computed server-side; amount can't drop below what has been paid
  if (patch.amount !== undefined && patch.amount < Number(cur.paid_amount)) throw new HttpError(400, 'Amount cannot be lower than payments already recorded');
  if (patch.cancelled === true) patch.cancelled_at = new Date().toISOString();
  if (patch.cancelled === false) patch.cancelled_at = null;
  const row = unwrap(await supabase.from('invoices').update(patch).eq('id', cur.id).select().single());
  await log(req, patch.cancelled ? 'cancel' : 'update', 'invoice', row.id); res.json({ data: row });
}));
router.post('/invoices/:id/payments', validate(S.payment), wrap(async (req, res) => {
  const inv = await mustFind('invoice_summary', req.params.id);
  if (inv.cancelled) throw new HttpError(409, 'Cannot record a payment on a cancelled invoice');
  if (req.body.amount > Number(inv.outstanding) + 0.001) throw new HttpError(400, `Payment exceeds the outstanding balance (${inv.outstanding})`);
  const row = unwrap(await supabase.from('invoice_payments').insert({ ...clean(req.body), invoice_id: inv.id }).select().single());
  await log(req, 'payment', 'invoice', inv.id, { amount: row.amount });
  res.status(201).json({ data: row });
}));
router.delete('/invoices/:id/payments/:paymentId', wrap(async (req, res) => {
  unwrap(await supabase.from('invoice_payments').delete().eq('id', req.params.paymentId).eq('invoice_id', req.params.id));
  await log(req, 'delete_payment', 'invoice', req.params.id); res.json({ data: { ok: true } });
}));
router.post('/invoices/:id/attachment', upload(MAX_PRIVATE).single('file'), wrap(async (req, res) => {
  const inv = await mustFind('invoices', req.params.id, 'id,attachment_path');
  const ext = checkFile(req.file, { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] });
  const storagePath = `invoices/${inv.id}/${crypto.randomUUID()}${ext}`;
  const up = await supabase.storage.from('private-files').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });
  if (up.error) throw new HttpError(502, 'Storage upload failed');
  if (inv.attachment_path) await supabase.storage.from('private-files').remove([inv.attachment_path]);
  unwrap(await supabase.from('invoices').update({ attachment_path: storagePath }).eq('id', inv.id));
  res.json({ data: { ok: true } });
}));
router.get('/invoices/:id/attachment', wrap(async (req, res) => {
  const inv = await mustFind('invoices', req.params.id, 'attachment_path,invoice_number');
  if (!inv.attachment_path) throw new HttpError(404, 'No attachment');
  const { data, error } = await supabase.storage.from('private-files').createSignedUrl(inv.attachment_path, 60);
  if (error) throw new HttpError(502, 'Could not create download link');
  res.json({ data: { url: data.signedUrl, expires_in: 60 } });
}));

// ===================== ENQUIRIES =====================
router.get('/enquiries', validate(S.pagination, 'query'), wrap(async (req, res) => {
  const { page, limit, q, status } = req.query;
  let query = supabase.from('contact_submissions').select('*', { count: 'exact' });
  if (status) query = query.eq('status', status);
  if (q) { const s = escapeLike(q); if (s) query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,brief.ilike.%${s}%`); }
  const [a, b] = pageRange(page, limit);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(a, b);
  unwrap({ data, error });
  res.json({ data, meta: { page, limit, total: count ?? 0 } });
}));
router.patch('/enquiries/:id', validate(S.enquiryUpdate), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('contact_submissions').update(req.body).eq('id', req.params.id).select().single());
  res.json({ data: row });
}));
router.post('/enquiries/:id/convert', wrap(async (req, res) => {
  const e = await mustFind('contact_submissions', req.params.id);
  let clientId = e.client_id;
  if (!clientId) {
    const existing = (await supabase.from('clients').select('id').ilike('email', e.email).maybeSingle()).data;
    clientId = existing?.id || unwrap(await supabase.from('clients').insert({ name: e.name, email: e.email, company: e.company }).select().single()).id;
  }
  const cp = unwrap(await supabase.from('client_projects').insert({
    client_id: clientId, title: e.service ? `${e.service} — ${e.name}` : `Project for ${e.name}`, requirements: e.brief,
  }).select().single());
  unwrap(await supabase.from('contact_submissions').update({ status: 'converted', client_id: clientId, client_project_id: cp.id }).eq('id', e.id));
  await log(req, 'convert', 'enquiry', e.id);
  res.status(201).json({ data: { client_id: clientId, client_project_id: cp.id } });
}));
router.delete('/enquiries/:id', wrap(async (req, res) => {
  unwrap(await supabase.from('contact_submissions').delete().eq('id', req.params.id));
  await log(req, 'delete', 'enquiry', req.params.id); res.json({ data: { ok: true } });
}));

// ===================== SETTINGS / ACTIVITY =====================
router.get('/settings', wrap(async (_req, res) => {
  res.json({ data: unwrap(await supabase.from('site_settings').select('*').eq('id', 1).single()) });
}));
router.put('/settings', validate(S.settings), wrap(async (req, res) => {
  const row = unwrap(await supabase.from('site_settings').update({ ...clean(req.body), updated_at: new Date().toISOString() }).eq('id', 1).select().single());
  await log(req, 'update', 'settings', 1); res.json({ data: row });
}));
router.get('/activity', wrap(async (_req, res) => {
  res.json({ data: unwrap(await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50)) });
}));

export default router;
