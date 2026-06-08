# TRUTH AUDIT — SahatGhar / AsaanCare
**Audit date:** 2026-06-04  
**Auditor:** Replit Agent (read-only pass — no code changed)

---

## STEP 1: File-by-file findings

---

### 1. `artifacts/api-server/src/routes/doctors.ts`
**REAL DRIZZLE/DB — no mock data.**

```
import { eq, ilike, and, or, sql, desc } from "drizzle-orm";
import { db, doctorsTable, doctorVerificationsTable } from "../lib/db";
```

- All endpoints query `db.select().from(doctorsTable)` or `db.update(doctorsTable)`.
- `mapDoctor()` helper transforms DB camelCase fields to API snake_case.
- Endpoints: GET /doctors, GET /doctors/stats, GET /doctors/:id, PATCH /doctors/:id, GET /doctors/:id/verification, POST /doctors/:id/verification/approve, POST /doctors/:id/verification/reject, PATCH /doctors/:id/status, POST /doctors.
- **No arrays, no hardcoded data.**

---

### 2. `artifacts/api-server/src/routes/patients.ts`
**REAL DRIZZLE/DB — no mock data.**

```
import { eq, ilike, and, or, desc } from "drizzle-orm";
import { db, patientsTable } from "../lib/db";
```

- All endpoints query `db.select().from(patientsTable)`.
- `mapPatient()` helper.
- Endpoints: GET /patients, GET /patients/stats, GET /patients/:id, PATCH /patients/:id/status, PATCH /patients/:id/block.
- **No mock data.**

---

### 3. `artifacts/api-server/src/routes/appointments.ts`
**REAL DRIZZLE/DB — no mock data.**

```
import { eq, ilike, and, or, desc, gte, lte } from "drizzle-orm";
import { db, appointmentsTable } from "../lib/db";
```

- All endpoints query `db.select().from(appointmentsTable)`.
- `mapAppointment()` helper.
- Endpoints: GET /appointments, GET /appointments/stats, GET /appointments/:id, PATCH /appointments/:id/status.
- **⚠️ ROUTE GAP (see Step 3):** The generated API client (`useUpdateAppointment`) calls `PATCH /api/appointments/:id` — but the server only handles `PATCH /appointments/:id/status`. The cancel action in the Appointments page uses `useUpdateAppointment` which hits the wrong URL. This will 404.

---

### 4. `artifacts/api-server/src/routes/auth.ts`
**FILE EXISTS. REAL DB + real bcryptjs.**

- `POST /auth/login` — queries `usersTable`, checks `role === "ADMIN"`, queries `adminUsersTable`, verifies with `bcrypt.compare(password, passwordHash)`, sets httpOnly cookie named `"token"`.
- `GET /auth/me` — reads `req.admin` from middleware, queries DB for user.
- `POST /auth/logout` — clears `"token"` cookie.
- `POST /auth/doctor/login` — queries `doctorsTable`, verifies bcryptjs.compare, sets httpOnly cookie named `"doctor_token"`.
- `GET /auth/doctor/me` — reads `"doctor_token"` cookie.

---

### 5. `artifacts/api-server/src/index.ts`
**This file only starts the HTTP server on `PORT`. Middleware is in `app.ts`.**

`app.ts` middleware stack (in order):
1. `pinoHttp` — request/response logging
2. `cors({ origin: true, credentials: true })`
3. `express.json()`
4. `express.urlencoded({ extended: true })`
5. `cookieParser()`
6. `app.use("/api", router)` — all 17 route modules registered here
7. `notFoundHandler`
8. `errorHandler`

**17 route modules registered:** health, auth, dashboard, doctors, patients, appointments, payments, refunds, payouts, reviews, clinics, subscriptions, support, audit, adminUsers, notifications.

---

### 6. `artifacts/sahatghar-admin/src/contexts/AuthContext.tsx`
**NO LOCAL BYPASS. Clean real-auth flow.**

- On mount: `fetch("/api/auth/me", { credentials: "include" })` — sets user from server response.
- `signIn`: `POST /api/auth/login` with `credentials: "include"`.
- `signOut`: `POST /api/auth/logout` with `credentials: "include"`.
- No hardcoded users, no `if (email === "admin@...")` shortcircuits, no local-storage token tricks.

---

### 7. Drizzle schema — `lib/db/src/schema/`
**EXISTS. Real Drizzle schema with 12 table files.**

Tables exported (from `schema/index.ts`):
- `users` — base user accounts
- `doctors` — doctor profiles + verification status
- `clinics`
- `availability`
- `appointments`
- `payments` — includes `refundsTable` and `doctorPayoutsTable`
- `support` — support tickets + messages
- `reviews`
- `audit` — immutable audit log
- `notifications`
- `patients`
- `subscriptions` — `subscriptionPlansTable` + `patientSubscriptionsTable`

DB connection (`lib/db/src/index.ts`):
```ts
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```
Throws at startup if `DATABASE_URL` is not set. The api-server's own `lib/db.ts` re-exports from `@workspace/db`.

---

### 8. Files containing `bcrypt`
**`bcryptjs` is used throughout — never native `bcrypt`.**

| File | Usage |
|------|-------|
| `artifacts/api-server/src/routes/auth.ts` (lines 2, 36, 132) | `import bcrypt from "bcryptjs"` / `bcrypt.compare(password, passwordHash)` |
| `artifacts/api-server/src/routes/adminUsers.ts` (lines 3, 56) | `bcrypt.hash(generatedPassword, 12)` |
| `artifacts/api-server/src/seed.ts` (lines 1, 27, 54) | `bcrypt.hash("SahatGhar@2025!", 12)` |

`artifacts/api-server/package.json`:
```json
"bcryptjs": "^3.0.2",
"@types/bcryptjs": "^2.4.6"
```
**No `"bcrypt"` (native) dependency found anywhere.**

---

### 9. Files containing `SUPER_ADMIN` or `Fareed`

**`SUPER_ADMIN`** — found in:
- `artifacts/sahatghar-admin/src/pages/AdminUsers.tsx` line 30: UI colour map `"SUPER_ADMIN": "bg-purple-100 text-purple-700 border-purple-200"` — display only.
- `artifacts/sahatghar-admin/src/pages/AdminUsers.tsx` line 37: `const ROLES = ["SUPER_ADMIN", "ADMIN", "FINANCE", "VERIFICATION_OFFICER", "SUPPORT"]` — invite-form dropdown.
- `artifacts/api-server/src/routes/doctors.ts` line 119: `requireRole("SUPER_ADMIN", "ADMIN")` — route guard on PATCH /doctors/:id/status.
- Various other routes use `requireRole("SUPER_ADMIN", ...)` as RBAC guards.
- **Assessment: Legitimate RBAC. No bypass.**

**`Fareed`** — **NOT FOUND anywhere in the codebase.**

---

### 10. `artifacts/` subfolder list

```
api-server/
doctor-app/
mockup-sandbox/
sahatghar-admin/
```

- **`patient-app/` does NOT exist.**
- `doctor-app/` exists and has a full Expo/React Native structure (app/, components/, contexts/, hooks/, server/, etc.) — it is seeded and has a workflow, but per replit.md it is not served from Replit.
- `mockup-sandbox/` is the Vite canvas preview server used for UI prototyping — not a user-facing app.

---

## STEP 2: YES/NO table with evidence

| Question | Answer | Evidence |
|----------|--------|----------|
| Does `/api/auth/login` endpoint exist? | **YES** | `routes/auth.ts` line 11: `router.post("/auth/login", ...)` |
| Does any route use Drizzle ORM? | **YES** | Every route imports `db` from `"../lib/db"` which re-exports `drizzle(pool, { schema })` |
| Is `DATABASE_URL` actually used in any route? | **YES** | `lib/db/src/index.ts` lines 7–13: throws if missing, then `new Pool({ connectionString: process.env.DATABASE_URL })` |
| Is bcryptjs installed in package.json? | **YES** | `artifacts/api-server/package.json` line: `"bcryptjs": "^3.0.2"` |
| Is local admin bypass removed from AuthContext? | **YES** | `AuthContext.tsx` — no bypass code exists; only real `/api/auth/login` and `/api/auth/me` calls |
| Does doctor app folder exist? | **YES** | `artifacts/doctor-app/` exists with full Expo structure |
| Is Supabase still imported anywhere? | **PARTIAL — DEAD FILE** | `supabase.ts` exists with placeholder URL/key. No other file imports it. But `@supabase/supabase-js` remains in admin `package.json` as an unused dependency. |

---

## STEP 3: Honest issues found during audit

### 🔴 CRITICAL — Route URL mismatch (Appointments cancel action broken)
- `useUpdateAppointment` (generated client) calls `PATCH /api/appointments/:id`
- Server only has `PATCH /appointments/:id/status`
- **Result:** The "Cancel" action in the Appointments page silently 404s. Nothing gets cancelled.
- **Evidence:** `api.ts` line 1387: `return '/api/appointments/${id}'` vs `appointments.ts` line 80: `router.patch("/appointments/:id/status", ...)`

### 🟡 WARNING — Dead Supabase file + unused package
- `artifacts/sahatghar-admin/src/lib/supabase.ts` — exists with placeholder credentials (`https://placeholder-url.supabase.co`). Not imported by any other file.
- `@supabase/supabase-js` is still in `artifacts/sahatghar-admin/package.json` (line 78). Adds bundle weight for nothing.
- **Status:** Dead code, not a runtime error.

### 🟡 WARNING — `PATCH /appointments/:id` route missing entirely
- The API spec generates an `updateAppointment` mutation for `PATCH /api/appointments/:id` (generic update), but no such route exists on the server. The only appointment write endpoint is the specific `/status` path.

### 🟢 CONFIRMED CLEAN — subscriptions route
- Previously noted as "known exception for mock data" in KNOWN_ISSUES.md. Current code: fully real Drizzle queries. No mock data. KNOWN_ISSUES.md entry is now stale/outdated.

### 🟢 CONFIRMED CLEAN — all other routes checked
- doctors, patients, appointments, payments, refunds, payouts, support, audit, adminUsers, subscriptions — all use real `db.*` calls. Zero hardcoded arrays found (grep for `mock`, `fake`, `hardcoded` returned no matches).

### 🟢 CONFIRMED CLEAN — auth cookie consistency
- `auth.ts` sets cookie named `"token"` (line 52).
- Auth middleware reads `req.cookies?.token` (line 13 of `middlewares/auth.ts`).
- AuthContext uses `credentials: "include"` so cookies are sent automatically.
- **No mismatch.**

---

## Summary of what still needs fixing (not done here)

| Priority | Issue |
|----------|-------|
| 🔴 Fix | Add `PATCH /appointments/:id` route (or fix the hook URL to call `/appointments/:id/status`) |
| 🟡 Clean up | Delete `supabase.ts`, remove `@supabase/supabase-js` from admin package.json |
| 🟡 Clean up | Update `KNOWN_ISSUES.md` — subscriptions mock data is gone |
