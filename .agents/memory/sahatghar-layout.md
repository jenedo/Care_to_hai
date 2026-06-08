---
name: SahatGhar project layout
description: Monorepo structure, port assignments, workflow names, and pnpm filter patterns.
---

## Monorepo root
All project code lives under `Supabase-Gateway/`. Always `cd Supabase-Gateway` before running pnpm workspace commands.

## Ports
- Admin frontend (Vite): port 5000 — workflow "Start application"
- API server (Express): port 3000 — workflow "API Server"
- Frontend proxies `/api` → `localhost:3000` via Vite config.

## Packages
- `@workspace/sahatghar-admin` — React 19 + Vite + Tailwind 4 + shadcn/ui + TanStack Query + Wouter
- `@workspace/api-server` — Express 5 + Drizzle ORM + Zod
- `@workspace/db` — Drizzle schema; push with `pnpm --filter @workspace/db run push`
- `@workspace/api-client-react` — Generated hooks from OpenAPI spec
- `@workspace/doctor-app` — Expo 54 (not started yet)

## Database
- Replit PostgreSQL provisioned; `DATABASE_URL` env set.
- Schema pushed with Drizzle. API still uses in-memory mock data.

**Why:** The monorepo has multiple apps; commands must be scoped to the right workspace package.
