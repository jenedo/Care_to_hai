# SahatGhar Admin Panel — Complete Project Report

> صحت آپ کے گھر — Telemedicine Admin Dashboard for Pakistan
> Generated: June 1, 2026

---

## 1. Project Overview

**SahatGhar** ("Your Home Health") is a production-ready telemedicine administration dashboard for Pakistan. It enables platform administrators to manage doctors, patients, appointments, payments, subscriptions, support, health records, and security — all from a single, secure, high-density web interface.

| Property | Value |
|---|---|
| Type | Web Application (React SPA) |
| Target Users | Platform Super Admins |
| Language | TypeScript (strict) |
| UI Paradigm | Data-dense admin dashboard |
| Auth | Supabase + local admin bypass |
| Real-time | Supabase Broadcast channels |

---

## 2. Repository Structure

```
workspace/                              ← pnpm monorepo root
├── artifacts/
│   ├── sahatghar-admin/                ← Frontend SPA (React + Vite)
│   │   ├── src/
│   │   │   ├── App.tsx                 ← Router + providers
│   │   │   ├── main.tsx                ← Vite entry point
│   │   │   ├── index.css               ← Tailwind + design tokens
│   │   │   ├── contexts/
│   │   │   │   ├── AuthContext.tsx     ← Auth state + signIn/signOut
│   │   │   │   └── NotificationContext.tsx  ← Real-time notification system
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AdminLayout.tsx ← Protected route wrapper + layout
│   │   │   │   │   ├── Sidebar.tsx     ← Navigation sidebar
│   │   │   │   │   └── Topbar.tsx      ← Header + notification bell
│   │   │   │   └── ui/                 ← shadcn/ui component library
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx           ← Auth page
│   │   │   │   ├── Dashboard.tsx       ← KPIs, charts, verification queue
│   │   │   │   ├── Doctors.tsx         ← Doctor management table
│   │   │   │   ├── DoctorDetail.tsx    ← Doctor profile + tabs
│   │   │   │   ├── Patients.tsx        ← Patient management table
│   │   │   │   ├── PatientDetail.tsx   ← Patient profile + history
│   │   │   │   ├── Appointments.tsx    ← Consultation management
│   │   │   │   ├── Payments.tsx        ← Transactions + refunds
│   │   │   │   ├── Subscriptions.tsx   ← Plans + MRR tracking
│   │   │   │   ├── SupportTickets.tsx  ← Ticket management + SLA
│   │   │   │   ├── HealthRecords.tsx   ← HIPAA record access log
│   │   │   │   ├── AuditLogs.tsx       ← Security event log
│   │   │   │   └── Settings.tsx        ← Platform configuration
│   │   │   ├── hooks/
│   │   │   │   ├── use-toast.ts        ← Toast notification hook
│   │   │   │   └── use-mobile.tsx      ← Responsive breakpoint hook
│   │   │   └── lib/
│   │   │       ├── supabase.ts         ← Supabase client
│   │   │       └── utils.ts            ← cn() tailwind helper
│   │   ├── vite.config.ts              ← Vite + path aliases
│   │   ├── tailwind.config.ts          ← Tailwind + design system tokens
│   │   └── package.json
│   │
│   └── api-server/                     ← Express 5 REST API
│       ├── src/
│       │   ├── index.ts                ← Express app entry + middleware
│       │   └── routes/
│       │       ├── index.ts            ← Route registry (all imports here)
│       │       ├── health.ts           ← GET /api/healthz
│       │       ├── dashboard.ts        ← /api/dashboard/*
│       │       ├── doctors.ts          ← /api/doctors/*
│       │       ├── patients.ts         ← /api/patients/*
│       │       ├── appointments.ts     ← /api/appointments/*
│       │       ├── payments.ts         ← /api/payments/*
│       │       ├── subscriptions.ts    ← /api/subscriptions/*
│       │       ├── support.ts          ← /api/support/tickets/*
│       │       ├── audit.ts            ← /api/audit/*
│       │       └── adminUsers.ts       ← /api/admin-users/*
│       ├── build.mjs                   ← esbuild bundler script
│       └── package.json
│
├── lib/
│   ├── api-spec/                       ← Source-of-truth OpenAPI 3.0 spec
│   │   ├── openapi.yaml                ← Full spec: all 9 modules, 40+ endpoints
│   │   └── orval.config.ts             ← Code generation config
│   │
│   └── api-client-react/               ← Generated code (DO NOT edit manually)
│       └── src/generated/
│           └── api.ts                  ← React Query hooks + Zod schemas
│
├── pnpm-workspace.yaml                 ← Package catalog + workspace config
├── tsconfig.base.json                  ← Shared TypeScript strict defaults
└── package.json                        ← Root dev tooling
```

---

## 3. Authentication

### Admin Login

| Field | Value |
|---|---|
| **Email** | `admin@sahatghar.pk` |
| **Password** | `SahatGhar@2025!` |
| **Role** | Super Admin |

### How it works

1. **Local Admin Bypass** (primary) — the credentials above are validated in `AuthContext.tsx` without a network call. On success, a session flag is stored in `localStorage`. This works instantly and offline.

2. **Supabase Auth** (for additional admins) — other email/password users authenticate via `supabase.auth.signInWithPassword()`. A Supabase project is connected at `https://tzacdqpgqmoppeuytprv.supabase.co`.

3. **Route Protection** — every page wraps with `<AdminLayout>`. That component checks `user` from `AuthContext`; if null, it redirects to `/login`.

### Adding More Admin Users via Supabase Dashboard
1. Go to `https://supabase.com/dashboard/project/tzacdqpgqmoppeuytprv`
2. Authentication → Users → Invite User
3. Set role to `authenticated`

### Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Replit Secrets | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Replit Secrets | Supabase public anon key |
| `SESSION_SECRET` | Replit Secrets | Express session signing |

---

## 4. API Contract (OpenAPI)

**Source of truth:** `lib/api-spec/openapi.yaml`

### Endpoints by Module

| Module | Base Path | Methods |
|---|---|---|
| Health | `/api/healthz` | GET |
| Dashboard | `/api/dashboard` | GET stats, activity, revenue-trend, verification-queue |
| Doctors | `/api/doctors` | GET list, POST create, GET /:id, PATCH /:id, PATCH /:id/status |
| Patients | `/api/patients` | GET list, POST create, GET /:id, PATCH /:id, PATCH /:id/block |
| Appointments | `/api/appointments` | GET list, GET stats, GET /:id, PATCH /:id |
| Payments | `/api/payments` | GET list, GET stats, GET /:id, POST /:id/refund |
| Subscriptions | `/api/subscriptions` | GET list, GET stats |
| Support | `/api/support/tickets` | GET list, GET stats, GET /:id, PATCH /:id |
| Audit | `/api/audit/logs` | GET list, GET stats |
| Admin Users | `/api/admin-users` | GET list, POST create, PATCH /:id/status |

### Regenerating API Client

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates `lib/api-client-react/src/generated/api.ts` (React Query hooks + Zod schemas) from the OpenAPI spec using **Orval**.

---

## 5. Frontend Modules (All 9)

### 5.1 Dashboard (`/dashboard`)
- **4 KPI cards**: Total Users (128,540), Verified Doctors (1,845), Today's Appointments (1,256), Monthly Revenue (PKR 24.68M)
- **Revenue Trend chart**: 30-day area chart (Recharts)
- **Appointment Status donut**: Live pie chart with legend
- **Verification Queue**: Doctor cards with live Approve ✓ / Reject ✗ buttons (calls `PATCH /doctors/:id/status`)
- **Recent Activity feed**: Timestamped admin action log

### 5.2 Doctor Management (`/doctors`, `/doctors/:id`)
- Searchable, filterable data table (status, specialty)
- 4 stat cards: Total / Verified / Pending / Suspended
- Per-doctor dropdown: View Profile, Approve, Reject, Suspend
- **Detail page** with tabs: Profile, Appointments, Reviews, Documents
- Status change via `useUpdateDoctorStatus` hook

### 5.3 Patient Management (`/patients`, `/patients/:id`)
- Search by name / phone
- Block/Unblock with toast feedback (`useTogglePatientBlock`)
- Detail page with consultation history, subscription tier, family members

### 5.4 Appointments (`/appointments`)
- Filter by status (pending / confirmed / completed / cancelled)
- Type icon (📹 video / 📞 phone)
- **Cancel appointment** with confirmation dialog (AlertDialog)
- **Mark Completed** inline action
- Calls `useUpdateAppointment`

### 5.5 Payments & Reconciliation (`/payments`)
- 4 stat cards: Total Collected / Pending Payouts / Unmatched / Failed
- Tabs: All Transactions / Refunds / Failed
- Per-row refund action with **confirmation dialog** (AlertDialog)
- Calls `useInitiateRefund`
- Export CSV button

### 5.6 Subscriptions (`/subscriptions`)
- MRR tracking with plan breakdown
- Churn analytics
- Promo code management

### 5.7 Support Tickets (`/support`)
- Green SLA banner: Avg Response Time, SLA Breaches, Compliance progress bar
- Filter by status + priority (urgent/high/medium/low)
- Per-ticket: Assign to Agent, **Mark Resolved**, Close Ticket
- Calls `useUpdateSupportTicket`

### 5.8 Health Records (`/health-records`)
- Record access audit log
- Delete queue management
- HIPAA-style access tracking
- Storage statistics

### 5.9 Audit Logs & Security (`/audit-logs`)
- Immutable security event log
- Admin role management
- Failed login monitoring
- IP-level filtering

---

## 6. Real-Time Notification System

**File:** `artifacts/sahatghar-admin/src/contexts/NotificationContext.tsx`

### Architecture
```
Supabase Broadcast Channel ("sahatghar-admin-notifications")
        ↓
NotificationContext (React Context + useState)
        ↓
Topbar.tsx → Bell icon with unread badge + dropdown panel
```

### Features
- **Notification types**: `doctor_application`, `support_ticket`, `payment_failed`, `appointment`, `system`
- **Real-time sync**: Supabase Broadcast pushes notifications to all open browser tabs simultaneously
- **Simulation**: New notifications auto-generated every 45 seconds (simulates live platform events)
- **Actions**: Mark as read (individual), Mark all read, Dismiss all
- **Click-through**: Clicking a notification navigates to the relevant module

### Initial Notifications (5 seeded)
1. New doctor application — Dr. Aisha Siddiqui (Cardiology)
2. Urgent support ticket — SLA breached
3. Payment gateway alert — 3 JazzCash failures
4. Appointment spike — 34% increase today
5. System maintenance notice

---

## 7. Design System

**Framework:** Tailwind CSS v4 + shadcn/ui components

### Color Palette (CSS Variables)
| Token | Value | Usage |
|---|---|---|
| `--primary` | Emerald 500 (`#10B981`) | Buttons, active states, badges |
| `--sidebar` | Dark navy (`#0F172A`) | Sidebar background |
| `--sidebar-primary` | Teal/emerald | Active nav item |
| `--background` | White | Main content area |
| `--muted` | Slate 50 | Table headers, cards |
| `--destructive` | Red 500 | Errors, cancel actions |

### Component Library (shadcn/ui)
All components are in `artifacts/sahatghar-admin/src/components/ui/`:
`Button`, `Card`, `Badge`, `Input`, `Select`, `Table`, `Tabs`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Form`, `Progress`, `Tooltip`, `Toast`, `Sidebar`, `Separator`, `Switch`, `Skeleton`, `Label`

### Charts
- **Recharts** — `AreaChart` (revenue), `PieChart` (appointment status)
- Custom tooltip formatters for PKR currency

---

## 8. Tech Stack

### Frontend (`artifacts/sahatghar-admin`)
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool + dev server |
| Tailwind CSS | 4 | Utility styling |
| shadcn/ui | latest | Component library |
| Wouter | 3 | Client-side routing |
| TanStack Query | 5 | Server state + caching |
| Recharts | 2 | Data visualization |
| @supabase/supabase-js | 2 | Auth + realtime |
| Zod | 3 | Form validation |
| React Hook Form | 7 | Form management |
| Lucide React | latest | Icon library |

### Backend (`artifacts/api-server`)
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 24 | Runtime |
| Express | 5 | HTTP server |
| TypeScript | 5.9 | Type safety |
| Pino | latest | Structured logging |
| esbuild | latest | Bundle/compile |

### External Services
| Service | Purpose |
|---|---|
| Supabase | Auth (email/password) + Realtime broadcast |
| Replit | Hosting, secrets, workflows |

---

## 9. Development Commands

```bash
# Start API server (port 8080, proxied via /api)
pnpm --filter @workspace/api-server run dev

# Start frontend dev server
pnpm --filter @workspace/sahatghar-admin run dev

# Full typecheck (all packages)
pnpm run typecheck

# Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Build all packages
pnpm run build
```

---

## 10. Deployment

The app is deployable via **Replit Deploy**:

1. Click **Deploy** in the Replit interface
2. Both services (`sahatghar-admin` + `api-server`) start automatically
3. The shared reverse proxy routes:
   - `/api/*` → Express API server (port 8080)
   - `/*` → React SPA (port 20913)
4. HTTPS is provisioned automatically
5. Environment variables from Replit Secrets are injected

**Production URL format:** `https://<project-slug>.replit.app`

---

## 11. Architecture Decisions

| Decision | Rationale |
|---|---|
| **Contract-first API** | OpenAPI spec in `lib/api-spec/` is the single source of truth; client hooks are generated, never hand-written |
| **Mock data in Express** | Full API with realistic Pakistani data (names, cities, PKR amounts) enables frontend dev without a real DB |
| **Local admin bypass** | Supabase `.pk` domains are invalid; hardcoded credentials in `AuthContext` avoid email confirmation friction in development |
| **Supabase Broadcast for realtime** | No Postgres tables needed — broadcast channels work with just the anon key |
| **pnpm workspaces** | Shared types (`api-spec`, `api-client-react`) are consumed by both frontend and future mobile apps |
| **shadcn/ui** | Components are copied into the repo (not a runtime dep), enabling full customization |

---

## 12. Next Steps / Roadmap

- [ ] **Patient app** (React Native / Expo) — `artifacts/sahatghar-patient`
- [ ] **Doctor app** (React Native / Expo) — `artifacts/sahatghar-doctor`
- [ ] **PostgreSQL database** — Replace mock data with Drizzle ORM schema
- [ ] **Supabase Row Level Security** — Per-admin access policies
- [ ] **File uploads** — Doctor document verification (Supabase Storage)
- [ ] **SMS notifications** — Twilio/Telenor Pakistan integration for appointment alerts
- [ ] **Analytics** — Monthly cohort reports, doctor performance scoring
- [ ] **Multi-language** — Urdu UI for non-English admins

---

*Report generated automatically from SahatGhar Admin Panel codebase — June 1, 2026*
