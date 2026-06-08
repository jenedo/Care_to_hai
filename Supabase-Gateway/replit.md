# SahatGhar Admin

Telemedicine administration platform for Pakistan. Admin dashboard to manage doctors, patients, appointments, payments, and more.

## Run & Operate

- `cd Supabase-Gateway && PORT=5000 BASE_PATH=/ pnpm --filter @workspace/sahatghar-admin run dev` — run the admin frontend (port 5000)
- `cd Supabase-Gateway && PORT=3000 pnpm --filter @workspace/api-server run dev` — run the API server (port 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (optional in dev, uses mock data)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite 7, Tailwind CSS 4, shadcn/ui, TanStack Query v5, Wouter
- API: Express 5 with mock data for dev
- DB: PostgreSQL + Drizzle ORM (optional)
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (API), Vite (frontend)

## Where things live

- `artifacts/sahatghar-admin/` — React admin dashboard
- `artifacts/api-server/` — Express API with mock data
- `lib/api-spec/openapi.yaml` — Source of truth for API contracts
- `lib/api-client-react/` — Generated React Query hooks (consumed by frontend)
- `lib/api-zod/` — Generated Zod schemas (consumed by API server)

## Architecture decisions

- Contract-first API: OpenAPI spec is written first, then code is generated via Orval
- Vite dev proxy: frontend proxies `/api` to `localhost:3000` (api-server)
- Mock data: api-server uses in-memory mock data for all routes in dev
- Supabase: used for auth and real-time notifications (credentials in `.replit` userenv)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Both `PORT` and `BASE_PATH` env vars are required to start the frontend
- Vite proxy must be running with the api-server for data to load
- The `minimumReleaseAge` in pnpm-workspace.yaml enforces supply-chain safety; don't disable it
