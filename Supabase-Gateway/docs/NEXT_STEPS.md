# NEXT_STEPS.md

Ordered by priority. Do not skip ahead.

---

## Phase 1 — Stabilize Current System (Do First)

### 1.1 Test End-to-End Admin Login
- [ ] Log in with `admin@sahatghar.pk / SahatGhar@2025!`
- [ ] Confirm dashboard loads with real data
- [ ] Confirm stats cards show correct numbers
- [ ] Confirm verification queue shows pending doctors

### 1.2 Run Seed if DB Is Empty
If dashboard shows zeros and no data:
```bash
pnpm --filter @workspace/api-server run seed
```

### 1.3 Test All Admin Sidebar Routes
Walk through every page and confirm:
- [ ] Doctors list loads
- [ ] Doctor detail opens
- [ ] Doctor verification approve/reject works
- [ ] Patients list loads
- [ ] Appointments list loads
- [ ] Payments list loads
- [ ] Refunds list + approve/reject works
- [ ] Payouts list + process works
- [ ] Clinics list + create/edit works
- [ ] Support tickets + reply works
- [ ] Reviews moderation works
- [ ] Notifications loads
- [ ] Audit logs loads
- [ ] Admin users list + create works

### 1.4 Fix Seed Script Duplicate Safety
Add `onConflictDoNothing()` to all seed inserts in `src/seed.ts`.

---

## Phase 2 — Doctor Verification Workflow

### 2.1 Verify the Full Flow
- [ ] Seed or create a doctor with `verification_status: "PENDING"`
- [ ] Admin logs in as VERIFICATION_OFFICER
- [ ] Sees doctor in verification queue on dashboard
- [ ] Opens doctor detail → views verification documents (CNIC, degree, PMDC)
- [ ] Clicks Approve → status changes to APPROVED
- [ ] OR clicks Reject with reason → status changes to REJECTED
- [ ] Audit log records the action
- [ ] Notification created for the doctor

### 2.2 Document Upload (if needed)
If verification documents are missing from UI:
- Implement file upload to Replit Object Storage
- Store URLs in `doctor_verifications` table
- Display document previews in doctor detail page

---

## Phase 3 — Doctor App Real Flows

### 3.1 Connect Doctor App to Live API
- [ ] Set API base URL to Replit API server public URL
- [ ] Test doctor login with `ayesha.noor@sahatghar.pk / Doctor@2025!`
- [ ] Confirm home screen loads real appointments
- [ ] Confirm appointment accept/reject works and reflects in admin dashboard

### 3.2 Doctor-Specific API Guards
- [ ] Ensure doctor can only see their own appointments (filter by `doctor_id`)
- [ ] Ensure doctor cannot access admin routes

### 3.3 Doctor Availability
- [ ] Connect availability screen to `doctor_availability` table
- [ ] Save/update availability slots via API

---

## Phase 4 — Subscriptions (Real DB)

- [ ] Design subscription plans table schema
- [ ] Add to Drizzle schema + migrate
- [ ] Replace mock data in `subscriptions.ts` routes with real DB queries
- [ ] Add subscription plan CRUD to admin frontend

---

## Phase 5 — Production Hardening

- [ ] Set `JWT_SECRET` in Replit Secrets (random 64-char string)
- [ ] Set rate limiting on auth routes
- [ ] Validate all inputs with Zod on API routes
- [ ] Add CSRF protection if needed
- [ ] File upload for doctor documents via Replit Object Storage
- [ ] Email notifications (SMTP or Replit integration)
- [ ] Remove seed credentials hint from login page UI

---

## Phase 6 — Patient App (DO NOT START YET)

Only begin after explicit approval and after all above phases are complete.

- Patient registration + login
- Patient appointment booking
- Patient payment flow
- Patient medical history / records
- Patient reviews
