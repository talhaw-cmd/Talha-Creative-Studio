-- graphicsbytalha: core schema
create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- profile row auto-created on signup, ALWAYS as 'user' (never admin)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role) values (new.id, new.email, 'user');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- media_assets ----------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('public-media','private-files')),
  path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  alt_text text,
  caption text,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

-- ---------- projects ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  year int,
  role text,
  tools text[] not null default '{}',
  tags text[] not null default '{}',
  challenge text,
  concept text,
  audience text,
  cover_media_id uuid references public.media_assets(id) on delete set null,
  cover_alt text,
  cover_focal_x numeric not null default 50,
  cover_focal_y numeric not null default 50,
  video_preview_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  position int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();
create index projects_status_idx on public.projects(status, position);

create table public.project_blocks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('rich_text','image','full_image','gallery','two_columns','video','before_after','pdf','palette','divider','spacer')),
  content jsonb not null default '{}'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index project_blocks_project_idx on public.project_blocks(project_id, position);

-- ---------- packages ----------
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text,
  price_type text not null default 'fixed' check (price_type in ('fixed','starting','quote')),
  price numeric(12,2),
  currency text not null default 'USD' check (currency in ('USD','PKR')),
  deliverables text[] not null default '{}',
  revisions int not null default 2,
  turnaround_days int,
  addons jsonb not null default '[]'::jsonb,   -- [{name, price}]
  faqs jsonb not null default '[]'::jsonb,     -- [{q, a}]
  terms text,
  cover_media_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_packages_updated before update on public.packages
  for each row execute function public.set_updated_at();

-- ---------- clients ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated before update on public.clients
  for each row execute function public.set_updated_at();

create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  scope text,
  dimensions text,
  audience text,
  references_notes text,
  brand_guidelines text,
  requirements text,
  internal_notes text,
  deadline date,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'brief' check (status in ('brief','in_progress','review','revisions','delivered','completed','cancelled')),
  revision_rounds int not null default 0,
  checklist jsonb not null default '[]'::jsonb, -- [{label, done}]
  package_id uuid references public.packages(id) on delete set null,
  published_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_client_projects_updated before update on public.client_projects
  for each row execute function public.set_updated_at();

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  client_project_id uuid not null references public.client_projects(id) on delete cascade,
  kind text not null default 'reference' check (kind in ('reference','contract','client_asset','source','final','invoice','other')),
  file_name text not null,
  storage_path text not null,        -- private-files bucket
  mime_type text,
  size_bytes bigint,
  description text,
  created_at timestamptz not null default now()
);

-- ---------- invoices ----------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_project_id uuid not null references public.client_projects(id) on delete restrict,
  issue_date date not null default current_date,
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','PKR')),
  cancelled boolean not null default false,
  cancelled_at timestamptz,
  notes text,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  note text,
  created_at timestamptz not null default now()
);

-- computed view: paid, outstanding, status (single source of truth)
create or replace view public.invoice_summary with (security_invoker = true) as
select i.*,
  coalesce(p.paid, 0) as paid_amount,
  greatest(i.amount - coalesce(p.paid, 0), 0) as outstanding,
  case
    when i.cancelled then 'cancelled'
    when coalesce(p.paid,0) >= i.amount and i.amount > 0 then 'paid'
    when i.due_date < current_date then 'overdue'
    when coalesce(p.paid,0) > 0 then 'partially_paid'
    else 'unpaid'
  end as status
from public.invoices i
left join (select invoice_id, sum(amount) paid from public.invoice_payments group by invoice_id) p
  on p.invoice_id = i.id;

-- ---------- contact_submissions ----------
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  service text,
  budget text,
  deadline text,
  brief text not null,
  reference_path text,
  status text not null default 'new' check (status in ('new','in_progress','converted','closed')),
  client_id uuid references public.clients(id) on delete set null,
  client_project_id uuid references public.client_projects(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- site_settings (single row) ----------
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_title text not null default 'graphicsbytalha',
  tagline text default 'Ideas made visible',
  seo_description text,
  contact_email text,
  whatsapp text,
  instagram text,
  behance text,
  linkedin text,
  about_text text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

-- ---------- activity_logs ----------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.media_assets enable row level security;
alter table public.projects enable row level security;
alter table public.project_blocks enable row level security;
alter table public.packages enable row level security;
alter table public.clients enable row level security;
alter table public.client_projects enable row level security;
alter table public.project_files enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.site_settings enable row level security;
alter table public.activity_logs enable row level security;

-- profiles: read own row only; no client writes (role can't be self-promoted)
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());

-- public read of published content
create policy categories_public_read on public.categories for select using (true);
create policy projects_public_read on public.projects for select using (status = 'published');
create policy blocks_public_read on public.project_blocks for select
  using (exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'));
create policy packages_public_read on public.packages for select using (status = 'published');
create policy settings_public_read on public.site_settings for select using (true);
create policy media_public_read on public.media_assets for select using (bucket = 'public-media');

-- public can submit enquiries (insert only, status forced to new)
create policy contact_public_insert on public.contact_submissions for insert
  with check (status = 'new' and client_id is null and client_project_id is null);

-- admin full access
do $$
declare t text;
begin
  foreach t in array array['categories','media_assets','projects','project_blocks','packages','clients',
    'client_projects','project_files','invoices','invoice_payments','contact_submissions','site_settings','activity_logs']
  loop
    execute format('create policy %I_admin_all on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;
