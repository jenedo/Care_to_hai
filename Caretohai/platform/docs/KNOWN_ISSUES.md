# AsaanCare — Known Issues

> Last updated: 2026-06-13

---

## Active Issues

---

### 1. Seed Script Does Not Guard Against Duplicate Runs
**Severity:** Low
**File:** `artifacts/api-server/src/seed.ts`

Running `npm run seed` multiple times inserts duplicate records. There is no `ON CONFLICT DO NOTHING` check.

**Workaround:** Only run seed on a fresh / empty database.

**Fix needed:** Wrap all seed inserts in `.onConflictDoNothing()` or add an existence check at the top.

---

### 2. `ticket_replies.is_internal` Stored as Text
**Severity:** Low
**File:** `lib/db/src/schema/support.ts`

The `is_internal` column is `text` storing `"true"` or `"false"` strings instead of a proper SQL `boolean`. Functionally works but is non-idiomatic.

**Fix needed:** Change to `boolean` in schema, run `db:push`.

---

### 3. Doctor Document URLs Are Placeholders
**Severity:** Medium
**Files:** `lib/db/src/schema/doctors.ts` (`doctor_verifications`)

The `cnic_front_url`, `cnic_back_url`, `degree_url`, `certificate_url` columns exist in the schema and in the UI, but no file upload system is implemented. The seed script uses placeholder strings.

**Fix needed:** Integrate Appwrite Storage (team subscription already exists). Upload endpoint → store URL in `doctor_verifications` → display in doctor detail page.

---

### 4. No Email / SMS Notifications
**Severity:** Low
**Status:** Not yet implemented

The `notifications` table and routes work, but there is no actual email delivery or SMS. Notification records are only stored in the database.

**Fix needed:** Integrate an email provider (Resend recommended) for appointment confirmations, doctor approvals, password resets. For SMS in Pakistan, consider Jazz/Telenor API or Twilio.

---

### 5. No Input Validation (Zod) on Most Routes
**Severity:** Medium
**Files:** Most route files in `artifacts/api-server/src/routes/`

Most routes do minimal input validation. Zod schemas exist in `@asaancare/api-zod` but are not uniformly applied in all API server routes. Auth routes already use Zod validators (`validators/auth.validators.ts`).

**Fix needed:** Add `req.body` validation with Zod before processing in each route handler. Pattern exists in auth routes — replicate across all other routes.

---

### 6. Mobile Apps Use Hardcoded API URL
**Severity:** Low (dev experience)
**Files:** `artifacts/patient-app/contexts/AuthContext.tsx`, `artifacts/doctor-app/contexts/AuthContext.tsx`

The API base URL is hardcoded to the Replit dev domain. For local development, this must be manually changed to `http://YOUR_LOCAL_IP:3000`.

**Fix needed:** Add `API_BASE_URL` to Expo's `app.json` `extra` config and read it via `expo-constants` to switch between dev and prod URLs based on `__DEV__`.

---

### 7. No Real-Time Chat (Polling Only)
**Severity:** Low (UX limitation)
**Files:** `artifacts/patient-app/app/(tabs)/chat.tsx`, `artifacts/doctor-app/app/(tabs)/consultation.tsx`

Both chat screens poll `GET /api/consultations/:id/messages` every 3 seconds. There is no WebSocket connection. Messages appear with up to a 3-second delay.

**Fix needed:** Add Socket.IO to the Express API server. Emit events on new messages. Both apps connect and listen for real-time updates. Polling stays as fallback.

---

## Fixed Issues (for reference)

| Issue | Resolution | Date |
|---|---|---|
| ✅ Rate limiting on auth routes | `express-rate-limit` applied to all login + register endpoints (20 req / 15 min / IP). Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`. | 2026-06-13 |
| ✅ Admin auth intercepting mobile routes | Rewrote `routes/index.ts` — mobile routes mounted before admin routers. Removed `router.use(requireAuth)` from mobile route files. | 2026-06-13 |
| ✅ Subscriptions used mock data | Migrated to real `subscription_plans` table with Drizzle queries | 2026-06-13 |
| ✅ Supabase dead code | Deleted `supabase.ts`, removed `@supabase/supabase-js` | 2026-06-04 |
| ✅ bcrypt native build failure | Replaced with `bcryptjs` everywhere | 2026-06-04 |
| ✅ Database not initialized | Ran `drizzle-kit push` + seed on Replit PostgreSQL | 2026-06-04 |
| ✅ Doctor app 401 on all routes | Per-route auth middleware; `requireDoctorOrPatientAuth` + `requireAnyAuth` added | 2026-06-13 |
| ✅ UUID stored as literal string | Changed schema from `.default("gen_random_uuid()")` to `.$defaultFn(() => randomUUID())` | 2026-06-04 |
