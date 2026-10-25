# API

All responses: `{ data, meta? }` or `{ error: { message, details? } }`. Admin routes need `Authorization: Bearer <Supabase access token>` of a user whose `profiles.role = 'admin'`.

## Public
| Method | Path | Notes |
|---|---|---|
| GET | /api/health | |
| GET | /api/settings, /api/categories | |
| GET | /api/projects | `page, limit(≤100), q, category(slug), sort=newest/oldest/title/position` — published only |
| GET | /api/projects/:slug | blocks, prev/next, related |
| GET | /api/packages, /api/packages/:slug | published only |
| POST | /api/contact | rate-limited (5 / 15 min), honeypot field `website` must be empty |

## Admin (`/api/admin`)
- `GET /dashboard`, `GET /activity`, `GET|PUT /settings`
- Categories: `GET|POST /categories`, `PATCH|DELETE /categories/:id`
- Projects: `GET|POST /projects`, `GET|PATCH|DELETE /projects/:id` (DELETE = archive), `POST /projects/:id/publish {publish}`, `/archive`, `/duplicate`, `PUT /projects/:id/blocks {blocks}`, `PUT /projects/reorder {ids}`
- Packages: `GET|POST /packages`, `GET|PATCH|DELETE /packages/:id` (DELETE = archive), `POST /packages/:id/publish`
- Media: `GET /media`, `POST /media` (multipart `file`), `PATCH|DELETE /media/:id`
- Clients: `GET|POST /clients`, `GET|PATCH|DELETE /clients/:id` (archives if it has projects)
- Client projects: `GET|POST /client-projects`, `GET|PATCH|DELETE /client-projects/:id`
- Files: `GET /files?client_project_id=`, `POST /files` (multipart), `GET /files/:id/download` (60 s signed URL), `DELETE /files/:id`
- Invoices: `GET|POST /invoices`, `GET|PATCH /invoices/:id`, `POST /invoices/:id/payments`, `DELETE /invoices/:id/payments/:pid`, `POST|GET /invoices/:id/attachment`
- Enquiries: `GET /enquiries`, `PATCH|DELETE /enquiries/:id`, `POST /enquiries/:id/convert`
