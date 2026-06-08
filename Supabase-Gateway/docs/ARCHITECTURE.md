# ARCHITECTURE.md

## System Overview

```
Browser / Admin User
        │
        ▼
┌─────────────────────────────┐
│  sahatghar-admin (port 5000)│  Vite + React + TypeScript
│  Admin Dashboard SPA        │  Tailwind CSS + Radix UI
└────────────┬────────────────┘
             │ /api/* (proxied by Vite dev server)
             ▼
┌─────────────────────────────┐
│  api-server (port 3000)     │  Express + TypeScript
│  REST API                   │  JWT auth, Drizzle ORM
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  PostgreSQL                 │  Replit managed (dev)
│  Database                   │  node-postgres pool
└─────────────────────────────┘

Doctor App (Expo / React Native)
        │
        │ /api/auth/doctor/* + other API routes
        ▼
   api-server (same backend)
```

---

## Monorepo Structure

```
Supabase-Gateway/
├── pnpm-workspace.yaml          Workspace config + version catalog
├── package.json                 Root devDependencies (prettier, typescript)
├── tsconfig.json                Root TypeScript config
│
├── artifacts/                   Runnable applications
│   ├── api-server/              Express REST API
│   │   ├── src/
│   │   │   ├── app.ts           Express app setup (cors, cookies, routes)
│   │   │   ├── index.ts         Entry point (reads PORT, starts server)
│   │   │   ├── routes/          One file per business domain
│   │   │   ├── middlewares/     auth.ts, errorHandler.ts
│   │   │   ├── lib/             db.ts, jwt.ts, logger.ts, pagination.ts,
│   │   │   │                    errors.ts, audit.ts, notify.ts
│   │   │   └── seed.ts          Demo data seeder
│   │   └── build.mjs            esbuild bundler script
│   │
│   ├── sahatghar-admin/         React admin dashboard
│   │   ├── src/
│   │   │   ├── App.tsx          Router (wouter) + route definitions
│   │   │   ├── contexts/        AuthContext.tsx
│   │   │   ├── pages/           One file per route/feature
│   │   │   ├── components/      Shared UI components
│   │   │   └── lib/             Utilities
│   │   └── vite.config.ts       Vite config (proxy /api → port 3000)
│   │
│   ├── doctor-app/              Expo React Native doctor app
│   │   ├── app/
│   │   │   ├── _layout.tsx      Root layout + AuthProvider + AuthGuard
│   │   │   ├── (tabs)/          Tab screens (home, appointments, profile)
│   │   │   ├── appointment/     Detail screen
│   │   │   └── login.tsx        Login screen
│   │   └── contexts/            AuthContext.tsx (AsyncStorage JWT)
│   │
│   └── mockup-sandbox/          UI component playground (not production)
│
└── lib/                         Shared packages
    ├── api-spec/                OpenAPI YAML + Orval codegen config
    ├── api-zod/                 Generated Zod schemas (from OpenAPI)
    ├── api-client-react/        Generated TanStack Query hooks (from OpenAPI)
    └── db/                      Drizzle schema + DB connection
        └── src/
            ├── index.ts         Exports db, pool
            └── schema/          One file per domain table
```

---

## Request Flow (Admin)

1. User hits admin SPA at port 5000
2. React app calls `GET /api/auth/me` with `credentials: "include"` (sends cookie)
3. API server validates JWT from httpOnly cookie
4. If valid → user is authenticated, dashboard loads
5. All subsequent API calls go through Vite proxy `/api` → `localhost:3000`

## Request Flow (Doctor App)

1. Doctor opens Expo app
2. App reads `sahatghar_doctor_token` from AsyncStorage
3. If token exists → calls `GET /api/auth/doctor/me` with `Authorization: Bearer <token>`
4. If valid → doctor is authenticated
5. All API calls include `Authorization: Bearer <token>` header

---

## API Code Generation

The shared API client is generated from the OpenAPI spec:

```
lib/api-spec/openapi.yaml
        │
        ▼ orval
lib/api-zod/          ← Zod request/response schemas
lib/api-client-react/ ← TanStack Query hooks
```

When the OpenAPI spec changes:
```bash
cd Supabase-Gateway
pnpm --filter @workspace/api-spec run generate
```

This regenerates both `api-zod` and `api-client-react`.

---

## Authentication Architecture

See `AUTH_GUIDE.md` for full details.

| App | Token storage | Sent via |
|---|---|---|
| Admin frontend | httpOnly cookie | Cookie header (automatic) |
| Doctor app | AsyncStorage | `Authorization: Bearer` header |

---

## Port Map

| Port | Service |
|---|---|
| 3000 | API server (Express) |
| 5000 | Admin frontend (Vite dev server) |
| 80 | External-facing admin (Replit proxy → 5000) |
