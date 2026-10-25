# Deployment

1. Run the SQL files on the production Supabase project, create the admin user and set its role.
2. Deploy `server/` (Node 18+) with env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_ORIGIN`, `NODE_ENV=production`.
3. Deploy `client/` with `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; add an SPA rewrite of all paths to `/index.html`.
