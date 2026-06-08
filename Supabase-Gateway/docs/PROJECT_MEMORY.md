# PROJECT_MEMORY.md — SahatGhar / AsaanCare

## Project Identity

- **Name:** SahatGhar (also branded AsaanCare)
- **Tagline:** صحت آپکے گھر (Health at Your Home)
- **Purpose:** Pakistan healthcare marketplace — telemedicine admin + doctor-facing tools
- **Status:** Active development. Admin + backend first. Patient app blocked until further approval.

---

## Current Priority Order

1. Admin website — stable, real DB connected
2. API server — all routes real PostgreSQL (no mock data except subscriptions)
3. Auth + RBAC — JWT/cookie for admin, JWT/AsyncStorage for doctor app
4. Doctor verification workflow — complete and tested
5. Doctor app — real API flows connected
6. Patient app — **DO NOT START** until explicitly approved

---

## Actual Stack

| Layer | Technology |
|---|---|
| Admin frontend | Vite + React + TypeScript (port 5000) |
| API server | Express + TypeScript (port 3000) |
| Database | PostgreSQL (Replit managed) |
| ORM | Drizzle ORM |
| Package manager | pnpm (monorepo workspace) |
| Doctor app | Expo / React Native (not running on Replit) |
| Password hashing | **bcryptjs** (pure JS, no native compilation) |
| Auth — admin | JWT in httpOnly cookie |
| Auth — doctor app | JWT in AsyncStorage (`sahatghar_doctor_token`) |
| Routing — admin | wouter |
| Routing — doctor app | expo-router |
| UI — admin | Tailwind CSS v4 + Radix UI |
| Shared packages | @workspace/api-zod, @workspace/api-client-react, @workspace/db |

---

## Monorepo Layout

```
Supabase-Gateway/
  artifacts/
    api-server/        Express backend
    sahatghar-admin/   Vite + React admin dashboard
    doctor-app/        Expo React Native doctor app
    mockup-sandbox/    UI component playground
  lib/
    api-spec/          OpenAPI YAML + Orval config
    api-zod/           Generated Zod schemas
    api-client-react/  Generated TanStack Query hooks
    db/                Drizzle schema + DB connection
  docs/                All documentation (this folder)
```

---

## What Was Recently Fixed

- `pnpm install` — all workspace dependencies installed
- `bcrypt` native build failure on Linux/Replit → replaced with `bcryptjs` everywhere
- `pnpm-workspace.yaml` `onlyBuiltDependencies` updated (bcrypt removed, bcryptjs added)
- Replit workflows configured and running:
  - `Start application` → port 5000 (admin frontend)
  - `API Server` → port 3000
- Login page loading and functional

---

## What MUST NOT Be Done

- Do not start or build the patient app
- Do not reinstall `bcrypt` (use `bcryptjs` always)
- Do not migrate Vite → Next.js without explicit approval
- Do not migrate Express → NestJS without explicit approval
- Do not migrate Drizzle → Prisma without explicit approval
- Do not leave mock data in production routes (subscriptions route is known mock — needs real DB)
- Do not call something "complete" unless end-to-end tested

---

## Business Modules

| Module | Status |
|---|---|
| Admin auth (login/logout/me) | Real DB |
| Doctor auth (login/me) | Real DB |
| Dashboard stats + activity + revenue | Real DB |
| Doctors list/detail/status | Real DB |
| Doctor verification (approve/reject) | Real DB |
| Patients list/detail/status | Real DB |
| Appointments list/detail/status | Real DB |
| Payments list/detail | Real DB |
| Refunds list/detail/process | Real DB |
| Payouts list/detail/process | Real DB |
| Clinics CRUD | Real DB |
| Support tickets + replies | Real DB |
| Reviews list/moderate | Real DB |
| Notifications | Real DB |
| Audit logs | Real DB |
| Admin user management | Real DB |
| Subscriptions/plans | **MOCK DATA** — needs real DB implementation |

---

## Dev Credentials (development only, never production)

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@sahatghar.pk | SahatGhar@2025! |
| Admin | admin@sahatghar.pk | SahatGhar@2025! |
| Doctor | ayesha.noor@sahatghar.pk | Doctor@2025! |
