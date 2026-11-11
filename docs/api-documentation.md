# CARISCA REST API (v1)

> **Interactive reference:** Swagger UI at `{API}/api/docs` (enabled by default outside production) and the machine-readable OpenAPI 3.1 spec at `{API}/api/openapi.json` and in [`openapi.json`](openapi.json) (`npm run docs:openapi` in `backend/`). This page is the narrative guide.

Base URL: `https://api.carisca.knust.edu.gh/api/v1` in production (to be confirmed); `http://localhost:5000/api/v1` locally.
All bodies are JSON (`Content-Type: application/json`) except file uploads (`multipart/form-data`).

## Conventions

**Success**

```json
{ "data": { … } }
{ "data": [ … ], "meta": { "page": 1, "pageSize": 12, "total": 132, "totalPages": 11 } }
```

`204 No Content` is returned for deletes and logout.

**Errors**: always the same shape. Production responses never include stack traces or SQL.

```json
{ "error": { "code": "validation_error", "message": "Some fields are invalid.",
  "fields": [ { "path": "email", "message": "Enter a valid email address" } ] } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `bad_request`, `upload_error` | Business-rule failure, malformed JSON, rejected file |
| 401 | `unauthorized` | No valid session (admin routes) or bad credentials |
| 403 | `forbidden` | Missing permission, bad CSRF token, or disallowed Origin |
| 404 | `not_found` | Unknown route, or the record is not published or doesn't exist |
| 409 | `conflict` | Unique value already used, duplicate registration, or file still in use |
| 413 | `payload_too_large` | Body or upload over the limit |
| 422 | `validation_error` | Zod or Sequelize validation; see `fields` |
| 429 | `rate_limited` | Too many login, reset or form attempts |
| 503 | `email_not_configured`, `service_unavailable` | Feature needs SMTP; database down (health) |

**Pagination**: `?page=1&pageSize=12`. Public lists allow at most 50 per page; admin lists allow at most 100.

**Authentication** (admin): `POST /auth/login` sets the HTTP-only cookie `carisca_sid` and returns `csrfToken`. Browser calls must use `credentials: 'include'`. Every state-changing request must send `X-CSRF-Token: <csrfToken>` and come from an allowed `Origin` (`FRONTEND_URL`).

## Health

`GET /health` → `200 {"status":"ok","database":"ok","time":"…"}` or `503` when MySQL is unreachable.

## Authentication — `/auth`

| Method & path | Body | Notes |
|---|---|---|
| `POST /auth/login` | `{ email, password }` | Rate-limited to 10 attempts per 15 min per IP+email. The account locks for 15 min after 8 failures. Returns the session (below). |
| `POST /auth/logout` | — | Destroys the session; `204` |
| `GET /auth/me` | — | Current session or `401` |
| `POST /auth/change-password` | `{ currentPassword, newPassword }` | Signs out the user's other sessions |
| `POST /auth/forgot-password` | `{ email }` | `503 email_not_configured` without SMTP. Otherwise the same response whether or not the account exists. |
| `POST /auth/reset-password` | `{ token, newPassword }` | Single-use token valid for 60 min |

Session response:

```json
{ "data": {
  "user": { "id": 1, "name": "Ama Mensah", "email": "ama@example.org", "status": "active", "last_login_at": "…" },
  "roles": ["editor"],
  "permissions": ["articles.create", "articles.publish", "articles.read", "…"],
  "csrfToken": "9f2c…64 hex…",
  "sessionExpiresAt": "2026-10-21T23:00:00.000Z" } }
```

Password policy: at least 12 characters, with upper- and lower-case letters and a number.

## Public content (no authentication)

Only content with `status = published` and `published_at <= now` is returned. Internal fields (`created_by`, `updated_by`, `review_note`, `deleted_at`, `legacy_url`) and storage details are removed. Media objects look like:

```json
{ "id": 1, "url": "https://api…/uploads/2026/10/0b7a9607-scaled-694b6a9c.jpg", "kind": "image",
  "mime_type": "image/jpeg", "size_bytes": 467277, "width": 2560, "height": 1707,
  "alt_text": "…", "caption": null, "title": null, "original_name": "0B7A9607-scaled.jpg" }
```

| Method & path | Query | Returns |
|---|---|---|
| `GET /site` | — | `{ settings: {key: value}, menus: { main, footer, utility } }`. Menu nodes: `{ id, label, href, description, open_in_new_tab, external, children[] }`. |
| `GET /home` | — | Homepage bundle: `slides, news, announcements, publications, upcomingEvents, upcomingCpdSessions, researchThemes, partners, latestLmi` |
| `GET /slides` | — | Active slides (within `starts_at` and `ends_at`) |
| `GET /pages/resolve` | `path=/about/directors-message` | `{ type: "page", page, siblings }`, or `{ type: "redirect", to, status }` for legacy URLs, or `404` |
| `GET /articles` | `page, pageSize, type` (comma list), `category` (slug), `year, q` | Article summaries + `meta` |
| `GET /articles/:slug` | — | Full article + `related[]` |
| `GET /categories` | — | Topics |
| `GET /research/themes` | — | Themes |
| `GET /research/projects` | `page, pageSize, theme` (slug), `status`, `programme`, `exclude_programme` | Projects |
| `GET /research/projects/:slug` | — | Project + linked `publications[]` |
| `GET /publications` | `page, pageSize, type` (comma list), `year, author, q` | Publications |
| `GET /publications/facets` | — | Counts by `type` and `publication_year` |
| `GET /publications/:slug` | — | Publication + `related[]` |
| `GET /lmi` | — | All LMI reports, newest first, with `indicators[]` |
| `GET /lmi/:slug` | — | One report |
| `GET /staff` | — | Groups with `members[]` (`has_profile` true when a biography exists) |
| `GET /staff/:slug` | — | Profile |
| `GET /partners` | — | Partners |
| `GET /cpd` | — | Programmes with `sessions[]` |
| `GET /cpd/:slug` | — | Programme with sessions |
| `GET /events` | `when=upcoming\|past\|all, type, year, q, page, pageSize` | Events (upcoming ascending, past descending) |
| `GET /events/:slug` | — | Event + `attachments[]` + published `gallery` |
| `GET /newsletters`, `/newsletters/:slug` | `page, pageSize` | Issues |
| `GET /galleries`, `/galleries/:slug` | `page, pageSize` | Galleries + `items[]` |
| `GET /search` | `q` (2+ chars), `type=all\|news\|publication\|event\|page\|research\|training`, `page` | Ranked results + `counts` per type |
| `GET /sitemap` | — | Slugs, paths and `updated_at` for the XML sitemap |

Example: `GET /articles?pageSize=1`

```json
{ "data": [ { "id": 1, "type": "news",
  "title": "Africa Must Leapfrog into the AI Era to Transform Supply Chains – Prof. Adegoke Oke",
  "slug": "africa-must-leapfrog-into-the-ai-era-to-transform-supply-chains-prof-adegoke-oke",
  "excerpt": "The summit, organised by …", "published_at": "2026-07-10T10:21:25.000Z",
  "deadline_at": null, "author_name": null, "is_featured": false,
  "featuredImage": { "id": 1, "url": "…/uploads/2026/10/0b7a9607-scaled-694b6a9c.jpg", "…": "…" },
  "categories": [] } ],
  "meta": { "page": 1, "pageSize": 1, "total": 132, "totalPages": 132 } }
```

Example: `GET /search?q=traceability&type=publication`

```json
{ "data": { "query": "traceability", "type": "publication",
  "results": [ { "type": "publication",
    "title": "Enhancing Drug Traceability in Ghana to Combat Counterfeit Medicines",
    "url": "/publications/enhancing-drug-traceability-in-ghana-to-combat-counterfeit-medicines",
    "snippet": "", "date": 2024, "score": 1.51 } ],
  "counts": { "publication": 2 } },
  "meta": { "page": 1, "pageSize": 10, "total": 2, "totalPages": 1 } }
```

## Public forms (no authentication)

All forms accept `website` (a honeypot that must be empty) and `startedAt` (milliseconds since epoch when the form was shown; submissions within 2.5 s are rejected). They are rate-limited to 8 submissions per 10 min per IP.

| Method & path | Body | Result |
|---|---|---|
| `POST /contact` | `{ name, email, phone?, organisation?, subject?, message (10–5000), topic?, details?: {k: v}, consent: true }` | `201 { ok, message }`. Messages with many links are stored with status `spam`. `topic` is one of general, research, training, partnership, media, iscea_certification, lmi. |
| `POST /subscribers` | `{ email, name?, consent: true, source? }` | `201` (new) or `200` (already subscribed, same message). With SMTP the sign-up is double opt-in (`status: pending`); without SMTP it is single opt-in with recorded consent. |
| `POST /subscribers/confirm` | `{ token }` | Confirms a pending subscription |
| `POST /subscribers/unsubscribe` | `{ token }` | Always `200` |
| `POST /cpd/sessions/:id/register` | `{ full_name, email, phone?, organisation?, job_title?, attendance_mode?, notes?, consent: true }` | `201 { status: "pending" \| "waitlisted" }`. `409` if already registered; `400` if closed or past. |

Example validation error (`POST /contact` with empty fields):

```json
{ "error": { "code": "validation_error", "message": "Some fields are invalid.", "fields": [
  { "path": "name", "message": "Please enter your name" },
  { "path": "email", "message": "Enter a valid email address" },
  { "path": "message", "message": "Please write a little more (at least 10 characters)" } ] } }
```

## Administrative API — `/admin` (session + permission required)

### Generic content resources

The same endpoints exist for each resource below (`backend/src/routes/admin/resources.ts`):

| Method & path | Permission | Notes |
|---|---|---|
| `GET /admin/<resource>` | `<perm>.read` | `page, pageSize (≤100), q, status (draft\|review\|published\|scheduled\|archived), sort, dir, mine=true, trashed=true` plus resource filters |
| `GET /admin/<resource>/:id` | `<perm>.read` | Includes media and relations |
| `POST /admin/<resource>` | `<perm>.create` | `201`. The slug is generated if blank. Rich text is sanitised. |
| `PATCH /admin/<resource>/:id` | `<perm>.update`, or `<perm>.update_own` for your own unpublished items | Partial update. Setting `status` to `published`/`archived` needs `<perm>.publish`. |
| `DELETE /admin/<resource>/:id` | `<perm>.delete` | Soft delete; `204` |
| `POST /admin/<resource>/:id/restore` | `<perm>.delete` | Restores a soft-deleted row |
| `POST /admin/<resource>/reorder` | `<perm>.update` | `{ ids: [3, 1, 2] }` for ordered resources |

| `<resource>` | `<perm>` | Extra fields / filters |
|---|---|---|
| `articles` | articles | `category_ids[]`; filters `type`, `category` |
| `pages` | pages | `path`, `parent_id` (cycles rejected) |
| `slides` | slides | `starts_at`, `ends_at` |
| `categories` | categories | |
| `research-themes`, `research-projects` | research | filter `theme` |
| `publications` | publications | filters `type`, `year` |
| `lmi-reports` | lmi | `indicators: [{ indicator, label, value }]` (replaces the set) |
| `staff`, `staff-groups` | staff | filter `group` |
| `partners` | partners | filter `type` |
| `cpd-programmes`, `cpd-sessions` | cpd | filters `programme`, `when=upcoming\|past` |
| `events` | events | `attachment_ids[]`; filters `type`, `when` |
| `newsletters` | newsletters | |
| `galleries` | galleries | `items: [{ media_id, caption }]` (replaces the set) |
| `redirects` | redirects | `from_path`, `to_path`, `status_code` |

Example: create and publish an article

```http
POST /api/v1/admin/articles
Cookie: carisca_sid=…
X-CSRF-Token: 9f2c…
Origin: https://carisca.knust.edu.gh

{ "title": "CARISCA hosts 2027 Research Summit", "type": "news",
  "excerpt": "…", "body": "<p>…</p>", "category_ids": [4], "status": "published" }
```

```json
201 { "data": { "id": 140, "slug": "carisca-hosts-2027-research-summit", "status": "published",
  "published_at": "2026-10-21T14:00:00.000Z", "categories": [ { "id": 4, "name": "Summits & Conferences" } ], "…": "…" } }
```

### Other admin endpoints

| Method & path | Permission | Notes |
|---|---|---|
| `GET /admin/dashboard` | any signed-in user | Counts from live queries + recent changes (if `audit.read`) |
| `GET /admin/media` | media.read | `q, kind, page, pageSize` |
| `GET /admin/media/:id` | media.read | Includes `usages[]` |
| `GET /admin/media/:id/download` | media.read | Streams private files |
| `POST /admin/media` | media.create | multipart: `file` + `alt_text?`, `caption?`, `title?`, `visibility?` |
| `PATCH /admin/media/:id` | media.update | `{ alt_text, caption, title }` |
| `POST /admin/media/:id/replace` | media.update | multipart `file`; same kind; every reference updates |
| `DELETE /admin/media/:id` | media.delete | `409` with `details.usages` while referenced |
| `GET /admin/menus` | menus.read | All menus as trees (including hidden items) |
| `PUT /admin/menus/:key` | menus.update | `{ items: [{ label, url?, page_id?, description?, open_in_new_tab?, is_enabled?, children? }] }`, at most 3 levels |
| `GET /admin/settings` / `PATCH /admin/settings` | settings.read / settings.update | `PATCH { key: value, … }`; email and URL types are validated |
| `GET /admin/submissions[/:id]`, `PATCH`, `DELETE` | submissions.* | `state, topic, q`; `?format=csv` exports (audited) |
| `GET /admin/subscribers`, `PATCH`, `DELETE` | subscribers.* | `state, q`; `?format=csv` |
| `GET /admin/registrations`, `PATCH`, `DELETE` | registrations.* | `session, state, q`; `?format=csv` |
| `GET /admin/audit-logs` | audit.read | `entity, action, user, q` |
| `GET /admin/users/roles` | users.read | Roles with permissions |
| `GET/POST /admin/users`, `GET/PATCH/DELETE /admin/users/:id` | users.* | Only Super Administrators can grant super_admin. The last active Super Administrator cannot be removed or disabled. |
| `POST /admin/users/:id/password` | users.update | `{ password }`: administrator-set password (used when SMTP is unavailable) |

## Static files

`GET /uploads/<YYYY>/<MM>/<file>`: public media, cached for 30 days, with `X-Content-Type-Options: nosniff` and a sandbox CSP. Non-viewable types are sent as attachments. Private files are never served here.
