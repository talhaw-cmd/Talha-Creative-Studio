# Database

Tables: profiles, categories, media_assets, projects, project_blocks, packages, clients, client_projects, project_files, invoices, invoice_payments, contact_submissions, site_settings, activity_logs. View: `invoice_summary` (paid, outstanding, status).

RLS: anonymous users can read published projects/blocks/packages, categories, settings and public media rows, and insert enquiries (status forced to `new`). Everything else requires `public.is_admin()`.

Storage: `public-media` (public read, admin write) and `private-files` (admin only; downloads via 60-second signed URLs created by the API).
