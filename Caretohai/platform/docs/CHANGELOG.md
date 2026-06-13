# AsaanCare — Changelog

All notable changes. Most recent first.

---

## 2026-06-13 — Consultation System, Auth Fix, Professional Cleanup

### Fixed — Critical Auth Bug
- **Root cause:** Express `router.use(requireAuth)` in admin router files intercepted ALL requests passing through, including mobile routes. Mobile doctor/patient requests were hitting admin auth first and getting 401.
- **Fix:** Rewrote `routes/index.ts` — all mobile-facing routers now mount BEFORE admin routers.
- **Fix:** Removed `router.use(requireAuth)` from `doctorProfile.ts`, `patientProfile.ts`, `consultations.ts` — replaced with per-route auth middleware.

### Added — New Auth Middleware
- `requireDoctorOrPatientAuth` — tries doctor JWT first, then patient JWT. Used on shared consultation endpoints (messages, complete session).
- `requireAnyAuth` — tries admin → doctor → patient. Used on GET `/consultations/:id` so all roles can read a session.

### Added — Public Plans Endpoint
- `GET /api/subscriptions/plans/public` — returns all active subscription plans without requiring any auth. Mobile patient app uses this to show pricing before login.

### Added — Consultation System (End-to-End)
- `POST /api/consultations` — patient creates consultation session; checks free trial eligibility
- `GET /api/consultations` — admin lists all sessions (pagination + search)
- `GET /api/consultations/:id` — get session detail (any authenticated role)
- `POST /api/consultations/:id/messages` — send message in session
- `GET /api/consultations/:id/messages` — fetch message history
- `PATCH /api/consultations/:id/start` — doctor marks session as active
- `PATCH /api/consultations/:id/complete` — doctor/patient ends session
- `PATCH /api/consultations/:id/pay` — patient pays for extended session (Rs. 75)

### Added — Doctor Online System
- `PATCH /api/doctor/status` — set ONLINE/OFFLINE/BUSY
- `POST /api/doctor/heartbeat` — extend online timestamp (every 30s)
- `GET /api/doctor/status` — get current doctor status
- `GET /api/consultation-requests/doctor` — doctor's pending requests
- `POST /api/consultation-requests` — patient sends consultation request
- `PATCH /api/consultation-requests/:id` — doctor accepts/rejects request

### Added — Profile Edit Routes
- `GET /api/doctor/profile` — doctor's own profile
- `PATCH /api/doctor/profile` — update name, bio, city, fee, online status
- `GET /api/patient/profile` — patient's own profile
- `PATCH /api/patient/profile` — update name, DOB, gender, blood group, address

### Added — Subscription Usage
- `GET /api/patient/subscription` — patient's active plan + usage counters

### Added — Patient App Screens
- **Plans screen** — 4-card pricing layout (Basic/Care/Family/Premium) with feature lists
- **Chat consultation** — real-time chat UI, 2-minute free trial timer, pay-to-continue popup (Rs. 75)
- **Profile edit** — edit name, DOB, gender, blood group, address (email locked)

### Added — Doctor App Screens
- **Dashboard** — online/offline toggle, heartbeat, pending consultation requests
- **Consultation chat** — accept session, message history, elapsed timer, complete session
- **Profile edit** — name, bio, city, fee, specialty, avatar

### Added — Admin Sessions Page
- `Sessions.tsx` — consultation monitoring table with status badges (WAITING/ACTIVE/COMPLETED/CANCELLED)
- Click any session to view full chat transcript in a slide-over dialog
- Session stats: duration, message count, patient/doctor info, cost

### Updated — Subscription Plans (Database)
- Basic: Free, pay-per-use (Rs. 75/session after 1 free/week), 1 member
- Care: Rs. 599/month, 2 chat + 1 audio + 1 video, 1 member
- Family: Rs. 999/month, 4 chat + 2 audio + 2 video, 3 members
- Premium: Rs. 1499/month, 5 chat + 3 audio + 3 video, 3 members + priority queue
- All plan `features` JSONB updated with descriptive feature strings

### Removed — Unnecessary Files
- `attached_assets/` — old pasted prompt files and ChatGPT images
- `PROJECT_REPORT.md` from monorepo root — content consolidated into `docs/`

### Added — Documentation
- `docs/DECISIONS.md` — architectural decision log (10 entries)
- `docs/DEPLOYMENT.md` — production deployment guide (Digital Ocean + Neon)
- `docs/LOCAL_SETUP.md` — comprehensive local development guide
- `docs/ARCHITECTURE.md` — rewritten with patient app, route ordering diagram, full folder tree

---

## 2026-06-05 — Branding + App Structure

### Added — AsaanCare Branding
- Patient Expo app renamed to "AsaanCare" (app.json, layout, login screen)
- Doctor Expo app renamed to "AsaanCare Doctor" (app.json, layout, login screen)
- Admin panel title updated to "AsaanCare Admin" with Urdu subtitle

### Added — Patient App Foundation
- Expo Router tab navigation (home, plans, chat, profile)
- Patient auth context (AsyncStorage JWT)
- Patient login screen with `POST /api/auth/patient/login`

### Added — Doctor App Foundation
- Expo Router tab navigation (home, consultation, profile)
- Doctor auth context (AsyncStorage JWT)
- Doctor login screen with `POST /api/auth/doctor/login`

---

## 2026-06-04 — bcrypt Fix + Database Bootstrap

### Fixed
- `bcrypt` native build failure: replaced with `bcryptjs` (pure JS, identical API). Updated all imports and `package.json`.
- `relation "users" does not exist`: ran `drizzle-kit push` to create all tables.

### Added
- Drizzle schema push (all tables created on Replit PostgreSQL)
- Seed script run: 5 admin users, 1 doctor login, 20 doctors, 50 patients, 100 appointments
- All 12 initial developer docs created in `docs/`
- Replit workflows configured (API Server port 3000, Admin Frontend port 5000)

---

## Pre-2026-06-04 — Initial Architecture

### Established
- pnpm monorepo under `platform/` (historical name — no Supabase code)
- Express API server with Drizzle ORM + PostgreSQL
- React + Vite admin dashboard
- Shared packages: `@asaancare/db`, `@asaancare/api-zod`, `@asaancare/api-client-react`
- OpenAPI spec → Orval codegen pipeline

### API routes initially implemented
Auth, Dashboard, Doctors (with verification workflow), Patients, Appointments, Payments, Refunds, Payouts, Clinics, Support tickets, Reviews, Notifications, Audit logs, Admin user management, Subscriptions (initially mock data)

### Database schema
15+ tables covering all business domains. UUID primary keys via `randomUUID()` from `node:crypto` (not SQL `gen_random_uuid()` — see `DECISIONS.md` DEC-XXX).
