import { z } from 'zod';

const slug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
const uuid = z.string().uuid();
const optUuid = z.string().uuid().nullable().optional();
const status3 = z.enum(['draft', 'published', 'archived']);
const currency = z.enum(['USD', 'PKR']);
const text = (n = 5000) => z.string().max(n);
const optText = (n = 5000) => z.string().max(n).nullable().optional();
const strArr = z.array(z.string().max(200)).max(50);

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(100).optional(),
  status: z.string().max(30).optional(),
  category: z.string().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'title', 'position']).optional(),
  type: z.enum(['image']).optional(),
  archived: z.enum(['true', 'false']).optional(),
  client_id: z.string().uuid().optional(),
});

export const category = z.object({
  name: z.string().min(1).max(80), slug, position: z.number().int().min(0).default(0),
});

export const project = z.object({
  title: z.string().min(1).max(200),
  slug,
  category_id: optUuid,
  description: optText(),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
  role: optText(120),
  tools: strArr.default([]),
  tags: strArr.default([]),
  challenge: optText(), concept: optText(), audience: optText(),
  cover_media_id: optUuid,
  cover_alt: optText(300),
  cover_focal_x: z.number().min(0).max(100).default(50),
  cover_focal_y: z.number().min(0).max(100).default(50),
  video_preview_url: z.string().url().nullable().optional().or(z.literal('')),
  featured: z.boolean().default(false),
  position: z.number().int().default(0),
});
export const projectUpdate = project.partial();

export const block = z.object({
  type: z.enum(['rich_text', 'image', 'full_image', 'gallery', 'two_columns', 'video', 'before_after', 'pdf', 'palette', 'divider', 'spacer']),
  content: z.record(z.any()).default({}),
  position: z.number().int().min(0).default(0),
});
export const blocksReplace = z.object({ blocks: z.array(block).max(200) });

export const packageSchema = z.object({
  name: z.string().min(1).max(160),
  slug,
  summary: optText(500),
  price_type: z.enum(['fixed', 'starting', 'quote']).default('fixed'),
  price: z.number().min(0).max(100000000).nullable().optional(),
  currency: currency.default('USD'),
  deliverables: strArr.default([]),
  revisions: z.number().int().min(0).max(100).default(2),
  turnaround_days: z.number().int().min(0).max(1000).nullable().optional(),
  addons: z.array(z.object({ name: z.string().min(1).max(120), price: z.number().min(0) })).max(30).default([]),
  faqs: z.array(z.object({ q: z.string().min(1).max(300), a: z.string().min(1).max(2000) })).max(30).default([]),
  terms: optText(),
  cover_media_id: optUuid,
  featured: z.boolean().default(false),
  position: z.number().int().default(0),
}).refine((p) => p.price_type === 'quote' || p.price != null, { message: 'Price is required unless quote-only', path: ['price'] });
export const packageUpdate = packageSchema.innerType().partial();

export const projectOrder = z.object({ ids: z.array(uuid).max(500) });

export const publishToggle =z.object({ publish: z.boolean() });

export const client = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: optText(40), company: optText(160), notes: optText(),
});
export const clientUpdate = client.partial().extend({ archived: z.boolean().optional() });

export const clientProject = z.object({
  client_id: uuid,
  title: z.string().min(1).max(200),
  scope: optText(), dimensions: optText(200), audience: optText(),
  references_notes: optText(), brand_guidelines: optText(), requirements: optText(), internal_notes: optText(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  status: z.enum(['brief', 'in_progress', 'review', 'revisions', 'delivered', 'completed', 'cancelled']).default('brief'),
  revision_rounds: z.number().int().min(0).max(100).default(0),
  checklist: z.array(z.object({ label: z.string().min(1).max(200), done: z.boolean() })).max(100).default([]),
  package_id: optUuid, published_project_id: optUuid,
});
export const clientProjectUpdate = clientProject.partial();

export const fileRecord = z.object({
  client_project_id: uuid,
  kind: z.enum(['reference', 'contract', 'client_asset', 'source', 'final', 'invoice', 'other']).default('reference'),
  description: optText(500),
});

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const invoice = z.object({
  invoice_number: z.string().min(1).max(60),
  client_project_id: uuid,
  issue_date: date.optional(),
  due_date: date,
  amount: z.number().min(0).max(1000000000),
  currency: currency.default('USD'),
  notes: optText(),
});
export const invoiceUpdate = invoice.partial().extend({ cancelled: z.boolean().optional() });

export const payment = z.object({
  amount: z.number().positive().max(1000000000),
  paid_on: date.optional(),
  method: optText(60), note: optText(500),
});

export const contact = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  company: optText(160),
  service: optText(160),
  budget: optText(80),
  deadline: optText(80),
  brief: z.string().min(10).max(5000),
  website: z.string().max(0).optional(), // honeypot — must stay empty
});

export const enquiryUpdate = z.object({
  status: z.enum(['new', 'in_progress', 'converted', 'closed']).optional(),
  client_id: optUuid, client_project_id: optUuid,
});

export const mediaUpdate = z.object({ alt_text: optText(300), caption: optText(500) });

export const settings = z.object({
  site_title: z.string().min(1).max(120),
  tagline: optText(200), seo_description: optText(300),
  contact_email: z.string().email().nullable().optional().or(z.literal('')),
  whatsapp: optText(40), instagram: optText(200), behance: optText(200), linkedin: optText(200),
  about_text: optText(),
}).partial();
