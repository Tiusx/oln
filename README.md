# oln - Self-Hosted Blog Platform

A modern self-hosted blogging platform deployed on Cloudflare, consisting of three apps:

- **web** (Astro SSR) — the public blog frontend, auto-deployed via Cloudflare Pages Git integration
- **server** (Hono Worker) — backend: public API, admin API, media & site config; deployed as a Cloudflare Worker
- **admin** (React SPA) — management panel, built and served alongside the server at `/admin/`

## Features

- Full post management: **categories / tags / pinning / drafts**
- **Post import / export**: auto-detects JSON & Markdown, downloadable format templates, per-item error reporting, automatic tag name resolution
- **Batch operations**: checkbox select on the posts list with batch delete
- Content management for **friend links, pages, message board, navigation, taxonomy**
- **Comments**: giscus / utterances / Waline (optional)
- **Storage & resources**: storage provider config (local / R2 / GitHub), browsable local resource library
- **Site config**: visual settings editor, configurable posts-per-page on the home page, SEO / head & foot injection / footer / author
- **Code highlighting**: highlight.js on article pages, follows light/dark theme
- **Theming**: light / dark, follows system or manual toggle
- **Security**: admin login, sessions, change-password

## Tech Stack

| App | Tech |
|-----|------|
| web | Astro 5, @astrojs/cloudflare (SSR), TypeScript, Waline |
| server | Hono, Drizzle ORM, TypeScript |
| admin | React 18, Vite 5, React Router |
| Data | Cloudflare D1 (SQLite), KV (cache), R2 (media) |

## Project Structure

```
/
├── package.json           root config & scripts
├── dev.bat                one-click local dev launcher
├── apps/
│   ├── admin/             management panel (Vite + React) → builds into server/public
│   ├── server/            backend (Hono Worker), incl. migrations/
│   └── web/               blog frontend (Astro SSR)
├── docs/                  deployment & structure docs
├── README.md              (English)
└── README.zh-CN.md        (中文)
```

## Local Development

Requires Node.js >= 20. Each service runs on its own port, wired through a proxy; **server is the core**.

```bash
npm install

# One-click launcher (recommended): starts server / admin / web
.\dev.bat

# Or start them individually
npm run dev:server   # http://localhost:8787
npm run dev:admin    # http://localhost:5173/admin/
npm run dev:web      # http://localhost:4321
```

On first run, initialize the local database and the first admin:

```bash
# Apply D1 migrations locally
npm --prefix apps/server run db:migrate:local

# Seed the first admin (admin / admin)
# POST http://localhost:8787/admin/api/auth/seed
```

> The admin panel default login is `admin / admin`; after logging in you can change the password from the sidebar (new password must be at least 8 characters).
> The frontend shows a "Admin" entry in the footer; its URL can be configured via the `PUBLIC_ADMIN_URL` env var (default `/admin/`).

## Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` / `dev:server` / `dev:admin` | Start each service |
| `npm run build:web` / `build:admin` | Build web / admin |
| `npm run typecheck:server` / `typecheck:admin` | Type-check |
| `npm run deploy` | Deploy server (with the admin bundle) |

## Deployment

- **server + admin**: pushing to `master` triggers GitHub Actions (`.github/workflows/deploy-server.yml`), which builds admin, applies D1 migrations remotely (idempotent `wrangler d1 migrations apply`), then deploys the Worker. Triggered only when `apps/server/**` or `apps/admin/**` change.
- **web**: auto-deployed through the Cloudflare Pages Git integration (SSR; config `PUBLIC_API_URL` and other env vars).

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [docs/](docs/) for details.
