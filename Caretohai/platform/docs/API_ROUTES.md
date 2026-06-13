# AsaanCare — API Routes Reference

**Base URL:** `http://localhost:3000/api` (dev) | `https://api.asaancare.pk/api` (prod)

All routes are prefixed with `/api`.

---

## Auth Middleware Quick Reference

| Middleware | Token | Storage |
|---|---|---|
| `requireAuth` | Admin JWT | httpOnly cookie `asaancare_admin_token` |
| `requireDoctorAuth` | Doctor JWT | Bearer `asaancare_doctor_token` |
| `requirePatientAuth` | Patient JWT | Bearer `asaancare_patient_token` |
| `requireDoctorOrPatientAuth` | Doctor OR Patient | Bearer (tries doctor first) |
| `requireAnyAuth` | Any role | Cookie or Bearer (admin → doctor → patient) |
| `requireRole(roles[])` | Admin + specific role | Cookie |

---

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/healthz` | None | Returns `{ status: "ok" }` |

---

## Auth — Admin

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | None | Body: `{ email, password }` → sets `asaancare_admin_token` cookie |
| GET | `/auth/me` | requireAuth | Returns current admin user object |
| POST | `/auth/logout` | requireAuth | Clears cookie |

### POST /auth/login
```json
Request:  { "email": "superadmin@asaancare.pk", "password": "AsaanCare@2025!" }
Response: { "success": true, "data": { "user": { "id", "email", "role", "fullName" } } }
```

---

## Auth — Doctor

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/doctor/login` | None | Body: `{ email, password }` → returns JWT in body (store in AsyncStorage) |
| GET | `/auth/doctor/me` | requireDoctorAuth | Returns current doctor profile |

### POST /auth/doctor/login
```json
Request:  { "email": "ayesha.noor@asaancare.pk", "password": "Doctor@2025!" }
Response: { "success": true, "data": { "token": "eyJ...", "doctor": { "id", "fullName", "specialty" } } }
```

---

## Auth — Patient

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/patient/login` | None | Body: `{ email, password }` → returns JWT in body |
| GET | `/auth/patient/me` | requirePatientAuth | Returns current patient profile |

---

## Doctor Online Status

All require `requireDoctorAuth` (Bearer token).

| Method | Path | Notes |
|---|---|---|
| GET | `/doctor/status` | Current online status |
| PATCH | `/doctor/status` | Body: `{ "status": "ONLINE" \| "OFFLINE" \| "BUSY" }` |
| POST | `/doctor/heartbeat` | Extend online window (call every 30s from app) |

---

## Doctor Profile (self)

All require `requireDoctorAuth`.

| Method | Path | Notes |
|---|---|---|
| GET | `/doctor/profile` | Full doctor profile |
| PATCH | `/doctor/profile` | Update: `fullName`, `bio`, `city`, `consultationFee`, `onlineStatus` |

---

## Patient Profile (self)

All require `requirePatientAuth`.

| Method | Path | Notes |
|---|---|---|
| GET | `/patient/profile` | Full patient profile |
| PATCH | `/patient/profile` | Update: `fullName`, `dateOfBirth`, `gender`, `bloodGroup`, `address` |
| GET | `/patient/subscription` | Current plan + usage (sessions used this month) |

---

## Consultation Requests

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/consultation-requests` | requirePatientAuth | Patient requests a doctor (creates pending request) |
| GET | `/consultation-requests/doctor` | requireDoctorAuth | Doctor's pending requests |
| PATCH | `/consultation-requests/:id` | requireDoctorAuth | Body: `{ "action": "ACCEPT" \| "REJECT" }` |

---

## Consultation Sessions (Chat)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/consultations` | requirePatientAuth | Start a new session (checks free trial) |
| GET | `/consultations` | requireAuth | Admin: list all sessions with pagination |
| GET | `/consultations/:id` | requireAnyAuth | Any authenticated user can read session |
| PATCH | `/consultations/:id/start` | requireDoctorAuth | Doctor starts the session (WAITING → ACTIVE) |
| PATCH | `/consultations/:id/complete` | requireDoctorOrPatientAuth | Mark session complete |
| PATCH | `/consultations/:id/pay` | requirePatientAuth | Patient pays Rs. 75 to extend session |
| POST | `/consultations/:id/messages` | requireDoctorOrPatientAuth | Send a message |
| GET | `/consultations/:id/messages` | requireDoctorOrPatientAuth | Get message history |

### POST /consultations
```json
Request:  { "doctorId": "uuid", "requestId": "uuid" }
Response: { "data": { "id": "uuid", "status": "WAITING", "isFreeSession": true } }
```

### POST /consultations/:id/messages
```json
Request:  { "content": "Hello doctor, I have a fever" }
Response: { "data": { "id": "uuid", "content": "...", "senderType": "PATIENT", "createdAt": "..." } }
```

---

## Subscriptions (Public — No Auth)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/subscriptions/plans/public` | None | Returns all active plans with features. Used by patient app before login. |

### Response
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Basic",
      "price": "0.00",
      "billingPeriod": "MONTHLY",
      "features": {
        "tier": "BASIC",
        "payPerUse": true,
        "maxMembers": 1,
        "chatSessions": 0,
        "features": ["1 free consultation per week", "..."]
      }
    }
  ]
}
```

---

## Dashboard (Admin)

All require `requireAuth`.

| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/stats` | KPI counts: doctors, patients, revenue, appointments |
| GET | `/dashboard/activity` | Recent audit log entries |
| GET | `/dashboard/revenue-trend` | Monthly revenue from payments table |
| GET | `/dashboard/verification-queue` | Doctors with PENDING/IN_REVIEW status |

---

## Doctors (Admin Management)

All require `requireAuth`.

| Method | Path | Notes |
|---|---|---|
| GET | `/doctors` | List with pagination, `search`, `status`, `specialty` filters |
| GET | `/doctors/stats` | Count by verification status |
| GET | `/doctors/:id` | Doctor detail + verification record |
| PATCH | `/doctors/:id` | Update any doctor fields |
| GET | `/doctors/:id/verification` | Verification documents |
| POST | `/doctors/:id/verification/approve` | requireRole(VERIFIER+) |
| POST | `/doctors/:id/verification/reject` | requireRole(VERIFIER+) — body: `{ reason }` |
| PATCH | `/doctors/:id/status` | requireRole(ADMIN+) — suspend/activate |

---

## Patients (Admin)

All require `requireAuth`.

| Method | Path | Notes |
|---|---|---|
| GET | `/patients` | List with pagination |
| GET | `/patients/stats` | Count by status |
| GET | `/patients/:id` | Patient detail |
| PATCH | `/patients/:id/status` | requireRole(ADMIN+) |

---

## Appointments (Admin)

All require `requireAuth`.

| Method | Path | Notes |
|---|---|---|
| GET | `/appointments` | List with pagination, date/status filter |
| GET | `/appointments/stats` | Count by status |
| GET | `/appointments/:id` | Appointment detail |
| PATCH | `/appointments/:id/status` | requireRole(ADMIN+) |

---

## Payments (Admin)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/payments` | requireAuth | List with pagination |
| GET | `/payments/:id` | requireAuth | Payment detail |

---

## Refunds (Admin)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/refunds` | requireAuth | List |
| GET | `/refunds/stats` | requireAuth | Count by status |
| GET | `/refunds/:id` | requireAuth | Refund detail |
| PATCH | `/refunds/:id` | requireRole(FINANCE+) | Approve/reject |

---

## Payouts (Admin)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/payouts` | requireAuth | List |
| GET | `/payouts/stats` | requireAuth | Count by status |
| GET | `/payouts/:id` | requireAuth | Payout detail |
| PATCH | `/payouts/:id` | requireRole(FINANCE+) | Process/reject |

---

## Clinics (Admin)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/clinics` | requireAuth | List |
| GET | `/clinics/:id` | requireAuth | Detail |
| POST | `/clinics` | requireRole(ADMIN+) | Create |
| PATCH | `/clinics/:id` | requireRole(ADMIN+) | Update |
| DELETE | `/clinics/:id` | requireRole(SUPER_ADMIN) | Logical delete |

---

## Support Tickets (Admin)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/support/tickets` | requireAuth | List with status filter |
| GET | `/support/stats` | requireAuth | Count by status/priority |
| GET | `/support/tickets/:id` | requireAuth | Ticket + all replies |
| PATCH | `/support/tickets/:id` | requireRole(SUPPORT+) | Update status/assignment |
| POST | `/support/tickets/:id/reply` | requireRole(SUPPORT+) | Add reply |

---

## Reviews (Admin)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reviews` | requireAuth | List |
| GET | `/reviews/stats` | requireAuth | Count by status/rating |
| GET | `/reviews/:id` | requireAuth | Detail |
| PATCH | `/reviews/:id` | requireRole(ADMIN+) | Approve/reject/hide |

---

## Admin Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin-users` | requireRole(ADMIN+) | List all admin staff |
| POST | `/admin-users` | requireRole(SUPER_ADMIN) | Create new admin |
| PATCH | `/admin-users/:id/status` | requireRole(SUPER_ADMIN) | Activate/deactivate |
| PATCH | `/admin-users/:id/role` | requireRole(SUPER_ADMIN) | Change role |

---

## Subscriptions (Admin)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/subscriptions/plans` | requireAuth | All plans (admin view) |
| GET | `/subscriptions/stats` | requireAuth | Subscription metrics |
| GET | `/subscriptions` | requireAuth | All patient subscriptions |

---

## Notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | requireAuth | Current admin's notifications |
| GET | `/notifications/unread-count` | requireAuth | Unread count |
| PATCH | `/notifications/:id/read` | requireAuth | Mark single read |
| POST | `/notifications/mark-all-read` | requireAuth | Mark all read |

---

## Audit Logs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/audit/logs` | requireAuth | Full audit trail with pagination |
| GET | `/audit/stats` | requireAuth | Count by action/entity type |

---

## Pagination

All list endpoints accept:

| Param | Default | Notes |
|---|---|---|
| `page` | 1 | Page number (1-indexed) |
| `limit` | 20 | Items per page (max 100) |
| `search` | — | Text search (varies by route) |
| `status` | — | Filter by status enum value |

**Response envelope:**
```json
{
  "success": true,
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

Common error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `INTERNAL_ERROR`
