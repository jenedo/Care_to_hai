# CHANGELOG.md

All notable changes to SahatGhar / AsaanCare. Most recent first.

---

## 2026-06-04 — Replit Migration + bcrypt Fix

### Fixed
- **bcrypt native build failure:** `bcrypt` package removed from `api-server` and replaced with `bcryptjs` (pure JavaScript, no native compilation required). Updated imports in `routes/auth.ts`, `routes/adminUsers.ts`, and `seed.ts`. Updated `package.json` to depend on `bcryptjs@^3.0.2` and `@types/bcryptjs`, removed `bcrypt@^6.0.0` and `@types/bcrypt`.
- **`onlyBuiltDependencies`:** Added `bcrypt` removal note to `pnpm-workspace.yaml` (bcrypt entry was in the list; removed, bcryptjs needs no build scripts).

### Added
- All pnpm workspace dependencies installed (`pnpm install`)
- Replit workflows configured and verified running:
  - `Start application` on port 5000 (admin frontend)
  - `API Server` on port 3000
- Admin login page confirmed loading in browser
- Project documentation created in `Supabase-Gateway/docs/`

### Status at this point
- API server: RUNNING (port 3000)
- Admin frontend: RUNNING (port 5000)
- Database: Connected (Replit managed PostgreSQL)
- Authentication: Functional (JWT cookie for admin, JWT bearer for doctors)

---

## 2026-06-04 — Database Bootstrap

### Fixed
- **`relation "users" does not exist`:** Database tables had never been created on the Replit PostgreSQL instance. Ran `pnpm --filter @workspace/db run push` (drizzle-kit push) to create all tables from schema.

### Added
- Seed script executed successfully — created:
  - 5 admin users (Super Admin, Admin, Finance, Support, Verifier) — `SahatGhar@2025!`
  - 1 doctor login (`ayesha.noor@sahatghar.pk / Doctor@2025!`)
  - 20 doctors, 50 patients, 100 appointments + payments, refunds, payouts, 15 support tickets, reviews, notifications
- All 12 developer handoff documents created in `Supabase-Gateway/docs/`
- `replit.md` updated with full user preferences and dev credentials
- Agent memory updated with bcryptjs migration notes and DB bootstrap procedure

### Status at this point
- API server: RUNNING (port 3000)
- Admin frontend: RUNNING (port 5000)
- Database: Tables created + seeded
- Login: Functional with real DB data

---

## Pre-migration — Initial Project State

### Architecture established
- Monorepo under `Supabase-Gateway/` using pnpm workspaces
- Express API server with Drizzle ORM + PostgreSQL
- React + Vite admin dashboard
- Expo React Native doctor app
- Shared packages: `@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`
- OpenAPI spec → Orval codegen pipeline

### API Routes implemented
- Auth (admin + doctor)
- Dashboard stats
- Doctors + verification workflow
- Patients
- Appointments
- Payments
- Refunds
- Payouts
- Clinics
- Support tickets
- Reviews
- Notifications
- Audit logs
- Admin user management
- Subscriptions (mock data — pending real DB)

### Database schema designed
- 15+ tables covering all business domains
- Drizzle ORM with proper TypeScript types
- UUID primary keys via `randomUUID()` from node:crypto

### Seed script
- Creates demo admins, doctors, patients, appointments, payments, refunds, payouts, support tickets, reviews, notifications
- Dev credentials documented in `AUTH_GUIDE.md`
