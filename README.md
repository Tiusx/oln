# oln - Self-Hosted Blog

A modern blogging platform consisting of three components:

## Architecture

- **web** (Astro) - Frontend blog, deployed to Cloudflare Pages
- **cms** (Hono Worker) - Backend CMS/Content API, deployed as Cloudflare Worker  
- **admin** (React) - Management panel for content, deployed to Cloudflare

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev:web     # Frontend dev server
npm run dev:cms     # CMS Worker dev server
npm run dev:admin   # Admin panel dev server

# Build
npm run build:web
npm run build:admin
npm run build:cms
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Tech Stack

- **Frontend**: Astro 4, React, TypeScript
- **Backend**: Hono, Cloudflare Workers
- **Admin**: React, Vite
- **Database**: Cloudflare KV / D1 (configuration)