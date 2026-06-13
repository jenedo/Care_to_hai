# AsaanCare — System Architecture

> Last updated: 2026-06-13

---

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                               │
│                                                               │
│  Admin Browser         Patient (iOS/Android)  Doctor (iOS/Android)
│  AsaanCare Admin       AsaanCare App          AsaanCare Doctor App
│  Port 5000 (Vite)      Expo / React Native    Expo / React Native
└──────────┬─────────────────────┬──────────────────┬──────────┘
           │ Cookie (httpOnly)   │ Bearer JWT        │ Bearer JWT
           │ /api/* (proxied)    │ /api/*            │ /api/*
           ▼                     ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    API SERVER (Port 3000)                     │
│                  Express + TypeScript                         │
│              JWT Auth  ·  Drizzle ORM  ·  REST               │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                   PostgreSQL DATABASE                         │
│        Replit managed (dev) · Digital Ocean (prod)           │
│                    node-postgres pool                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Folder Note

The monorepo lives inside `platform/` — the pnpm workspace root for all AsaanCare applications and shared libraries.

---

## Monorepo Structure

```
platform/               ← pnpm workspace root
├── pnpm-workspace.yaml         ← Workspace packages + version catalog
├── package.json                ← Root devDeps (prettier, typescript)
├── tsconfig.json               ← Root TypeScript config (references)
├── tsconfig.base.json          ← Shared TS compiler options
├── docs/                       ← All developer documentation (you are here)
│
├── artifacts/                  ← Runnable applications
│   ├── api-server/             ← Express REST API
│   │   └── src/
│   │       ├── app.ts          ← Express setup (cors, cookies, routes)
│   │       ├── index.ts        ← Entry point (PORT env var, start server)
│   │       ├── seed.ts         ← Demo data seeder
│   │       ├── routes/         ← One file per business domain
│   │       │   ├── index.ts    ← CRITICAL: route mounting order (see below)
│   │       │   ├── auth.ts     ← Admin + Doctor + Patient auth
│   │       │   ├── publicPlans.ts     ← Public subscription plans (no auth)
│   │       │   ├── doctorStatus.ts    ← Doctor online/offline, heartbeat
│   │       │   ├── doctorProfile.ts   ← Doctor profile CRUD (doctor auth)
│   │       │   ├── patientProfile.ts  ← Patient profile CRUD (patient auth)
│   │       │   ├── consultations.ts   ← Chat sessions + messages
│   │       │   ├── subscriptionUsage.ts ← Patient subscription info
│   │       │   ├── doctors.ts         ← Admin: doctor management
│   │       │   ├── patients.ts        ← Admin: patient management
│   │       │   ├── dashboard.ts       ← Admin: KPI stats
│   │       │   ├── appointments.ts    ← Admin: appointment management
│   │       │   ├── payments.ts        ← Admin: payment records
│   │       │   ├── refunds.ts         ← Admin: refund management
│   │       │   ├── payouts.ts         ← Admin: payout management
│   │       │   ├── clinics.ts         ← Admin: clinic management
│   │       │   ├── support.ts         ← Admin: support tickets
│   │       │   ├── reviews.ts         ← Admin: review moderation
│   │       │   ├── notifications.ts   ← Admin: notification management
│   │       │   ├── auditLogs.ts       ← Admin: audit trail
│   │       │   ├── adminUsers.ts      ← Admin: user management
│   │       │   └── subscriptions.ts   ← Admin: subscription plans (admin auth)
│   │       ├── middlewares/
│   │       │   ├── auth.ts            ← All auth middleware (see AUTH_GUIDE.md)
│   │       │   └── errorHandler.ts    ← Global error handler
│   │       └── lib/
│   │           ├── db.ts              ← Drizzle instance (reads DATABASE_URL)
│   │           ├── jwt.ts             ← Sign/verify JWT (reads JWT_SECRET)
│   │           ├── cookies.ts         ← Cookie name constants
│   │           ├── pagination.ts      ← Reusable paginated query helper
│   │           ├── errors.ts          ← AppError class hierarchy
│   │           ├── logger.ts          ← Structured logging
│   │           ├── audit.ts           ← Audit log writer
│   │           └── notify.ts          ← In-app notification writer
│   │
│   ├── admin-dashboard/        ← React admin dashboard (npm: @asaancare/admin-dashboard)
│   │   └── src/
│   │       ├── App.tsx         ← Wouter router + all route definitions
│   │       ├── contexts/
│   │       │   └── AuthContext.tsx    ← Admin auth state (GET /api/auth/me)
│   │       ├── pages/          ← One component per page/route
│   │       │   ├── Login.tsx
│   │       │   ├── Dashboard.tsx
│   │       │   ├── Doctors.tsx / DoctorDetail.tsx
│   │       │   ├── Patients.tsx / PatientDetail.tsx
│   │       │   ├── Appointments.tsx
│   │       │   ├── Payments.tsx
│   │       │   ├── Refunds.tsx
│   │       │   ├── Payouts.tsx
│   │       │   ├── Sessions.tsx       ← Consultation session monitoring
│   │       │   ├── Subscriptions.tsx
│   │       │   ├── Support.tsx
│   │       │   ├── Reviews.tsx
│   │       │   ├── Clinics.tsx
│   │       │   ├── Notifications.tsx
│   │       │   ├── AuditLogs.tsx
│   │       │   └── AdminUsers.tsx
│   │       ├── components/     ← Shared UI (Sidebar, Header, DataTable, etc.)
│   │       ├── lib/            ← api.ts fetch wrapper, utils.ts
│   │       └── hooks/          ← useQuery hooks for each data domain
│   │   └── vite.config.ts      ← Vite dev server + /api proxy to port 3000
│   │
│   ├── patient-app/            ← Patient Expo app (npm: @asaancare/patient-app)
│   │   └── app/
│   │       ├── _layout.tsx     ← Root layout + AuthProvider + AuthGuard
│   │       ├── login.tsx       ← Patient login screen
│   │       ├── (tabs)/         ← Tab navigator screens
│   │       │   ├── index.tsx   ← Home / doctor search
│   │       │   ├── plans.tsx   ← Subscription plans (4-card pricing page)
│   │       │   ├── chat.tsx    ← Consultation chat + 2-min timer
│   │       │   └── profile.tsx ← Patient profile edit
│   │       └── contexts/
│   │           └── AuthContext.tsx    ← Patient JWT in AsyncStorage
│   │
│   ├── doctor-app/             ← Doctor Expo app (npm: @asaancare/doctor-app)
│   │   └── app/
│   │       ├── _layout.tsx     ← Root layout + AuthProvider + AuthGuard
│   │       ├── login.tsx       ← Doctor login screen
│   │       ├── (tabs)/
│   │       │   ├── index.tsx   ← Dashboard (online toggle, stats)
│   │       │   ├── consultation.tsx ← Doctor chat screen
│   │       │   └── profile.tsx ← Doctor profile edit
│   │       └── contexts/
│   │           └── AuthContext.tsx    ← Doctor JWT in AsyncStorage
│   │
└── lib/                        ← Shared packages (consumed by artifacts)
    ├── db/                     ← Drizzle schema + DB connection
    │   └── src/
    │       ├── index.ts        ← Exports: db, pool, all schema tables
    │       └── schema/         ← One file per domain
    │           ├── admins.ts
    │           ├── doctors.ts
    │           ├── patients.ts
    │           ├── appointments.ts
    │           ├── payments.ts
    │           ├── consultations.ts    ← consultation_sessions, session_messages
    │           ├── subscriptions.ts    ← subscription_plans, patient_subscriptions
    │           ├── freeTrials.ts       ← free_trial_records
    │           ├── support.ts
    │           ├── reviews.ts
    │           ├── clinics.ts
    │           ├── notifications.ts
    │           └── auditLogs.ts
    ├── api-spec/               ← OpenAPI YAML spec (source of truth for types)
    ├── api-zod/                ← Generated Zod schemas (from api-spec via orval)
    └── api-client-react/       ← Generated TanStack Query hooks (from api-spec)
```

---

## Route Mounting Order (CRITICAL)

`artifacts/api-server/src/routes/index.ts` mounts routers in this order. **Do not change the order.**

**Why it matters:** Express `router.use(middleware)` without a path prefix runs middleware on ALL requests passing through that router — not just the routes defined in it. Admin routers use `router.use(requireAuth)` which would intercept and reject mobile app requests if mounted first.

```
1. /healthz          → healthRouter        (no auth)
2. /auth             → authRouter          (no auth — login/logout)
3. /subscriptions/plans/public → publicPlansRouter  (no auth)
4. /doctor           → doctorStatusRouter  (per-route: requireDoctorAuth)
5. /doctor           → doctorProfileRouter (per-route: requireDoctorAuth)
6. /patient          → patientProfileRouter(per-route: requirePatientAuth)
7. /consultations    → consultationsRouter (per-route: mixed auth)
8. /subscriptions    → subscriptionUsageRouter (per-route: requirePatientAuth)
── ADMIN ROUTERS BELOW (all use router.use(requireAuth)) ──
9. /dashboard        → dashboardRouter
10. /doctors         → doctorsRouter
11. /patients        → patientsRouter
12. /appointments    → appointmentsRouter
...etc
```

---

## Authentication Architecture

See `AUTH_GUIDE.md` for full details.

| App | Token name | Storage | Sent via |
|---|---|---|---|
| Admin frontend | `asaancare_admin_token` | httpOnly cookie | Cookie header (auto) |
| Doctor app | `asaancare_doctor_token` | AsyncStorage | `Authorization: Bearer` |
| Patient app | `asaancare_patient_token` | AsyncStorage | `Authorization: Bearer` |

### Auth Middleware Available

| Middleware | Who | Use for |
|---|---|---|
| `requireAuth` | Admin JWT only | All admin routes |
| `requireRole(...roles)` | Admin + specific roles | Role-gated admin actions |
| `requireDoctorAuth` | Doctor JWT only | Doctor profile, status, chat |
| `requirePatientAuth` | Patient JWT only | Patient profile, subscriptions |
| `requireDoctorOrPatientAuth` | Doctor OR Patient | Shared consultation actions |
| `requireAnyAuth` | Admin OR Doctor OR Patient | Read-only shared views (e.g. GET /consultations/:id) |

---

## Database Schema Summary

| Table | Purpose |
|---|---|
| `admin_users` | Admin staff accounts + roles |
| `doctors` | Doctor profiles, verification status, rating |
| `doctor_verifications` | CNIC/degree documents, PMDC number |
| `patients` | Patient accounts, subscription link |
| `appointments` | Scheduled appointments |
| `payments` | Payment records |
| `refunds` | Refund requests + status |
| `payouts` | Doctor payout records |
| `consultation_sessions` | Live/completed chat sessions |
| `session_messages` | Messages inside consultation sessions |
| `free_trial_records` | Tracks 1-free-session-per-week per patient |
| `card_verifications` | Rs. 0 card auth for abuse prevention |
| `consultation_requests` | Patient→doctor connection requests |
| `subscription_plans` | 4 plans: Basic/Care/Family/Premium |
| `patient_subscriptions` | Which plan a patient is on |
| `clinics` | Physical clinic locations |
| `support_tickets` | Patient/doctor support tickets + replies |
| `reviews` | Doctor reviews from patients |
| `notifications` | In-app notifications |
| `audit_logs` | Admin action trail |

---

## Port Map

| Port | Service | Notes |
|---|---|---|
| 3000 | API server | Express, all `/api` routes |
| 5000 | Admin frontend | Vite dev server, proxies `/api` → 3000 |
| 8081 | Patient Expo | Metro bundler (not served from Replit) |
| 8082 | Doctor Expo | Metro bundler (not served from Replit) |

---

## Technology Decisions

See `DECISIONS.md` for full rationale on every major technology choice.

| Concern | Choice | Rejected |
|---|---|---|
| ORM | Drizzle | Prisma, TypeORM |
| Auth | Custom JWT (bcryptjs) | Supabase Auth, Clerk (future migration planned) |
| Password hashing | bcryptjs | bcrypt (native build fails on Linux/Replit) |
| API framework | Express | NestJS, Fastify |
| Frontend | Vite + React | Next.js |
| Mobile | Expo / React Native | Flutter |
| DB (prod) | Digital Ocean Managed PostgreSQL | Supabase, PlanetScale |
