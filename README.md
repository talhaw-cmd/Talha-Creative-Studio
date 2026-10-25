# graphicsbytalha

Portfolio website + private admin CMS (projects, packages, media, clients, files, invoices, enquiries).
React + Vite → Express API → Supabase (Postgres, Auth, Storage). GSAP reveals and a lazy-loaded Three.js hero.

## 1. Supabase setup
1. Create a Supabase project.
2. In the SQL editor run, in order: `supabase/migrations/0001_schema.sql`, `supabase/storage-policies.sql`, then (optional sample content) `supabase/seed.sql`.
3. **Create the first admin**: Authentication → Users → *Add user* (email + password, auto-confirm). Then run once in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   Roles can only be changed this way (service role / SQL) — the public site cannot promote anyone.
4. Disable public sign-ups: Authentication → Providers → Email → turn off *Allow new users to sign up*.

## 2. Environment
Copy `.env.example`: server values go in `server/.env`, client values (`VITE_*`) in `client/.env`.
The **service-role key is server-only** — never put it in the client.

## 3. Run locally
```bash
npm install
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173  (admin at /admin)
```

## 4. Build
```bash
npm run build        # client/dist
```

## Deployment
See `docs/DEPLOYMENT.md`. Check each provider's current free-tier limits before relying on them.

## Troubleshooting
- *Server exits "Missing required environment variables"* → fill `server/.env`.
- *Admin says "No access"* → the user's `profiles.role` is not `admin`.
- *CORS error* → add the frontend origin to `CLIENT_ORIGIN` (comma separated).
- *Upload rejected* → type must be allow-listed, extension must match content, size ≤ 20 MB (media) / 50 MB (private files).

## Notes
- Invoices track records and manual payments only; no payment processing or tax logic.
- Invoice balance and status (unpaid / partially paid / paid / overdue / cancelled) are computed in the database view `invoice_summary`, never trusted from the client.
- Deleting a project archives it; media is never removed with a project, and media still in use cannot be deleted.
- Not included yet: reference-file upload on the public contact form (needs a hardened public upload endpoint).
