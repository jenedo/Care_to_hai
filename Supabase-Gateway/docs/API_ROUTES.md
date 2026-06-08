# API_ROUTES.md

Base URL: `http://localhost:3000/api` (dev) | All routes prefixed with `/api` in production.

Auth middleware:
- `requireAuth` — any authenticated admin (JWT cookie)
- `requireRole(...)` — specific role(s) only

---

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/healthz` | None | Returns `{ status: "ok" }` |

---

## Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | None | Admin login → sets cookie |
| GET | `/auth/me` | requireAuth | Returns current admin user |
| POST | `/auth/logout` | requireAuth | Clears cookie |
| POST | `/auth/doctor/login` | None | Doctor login → returns JWT in body |
| GET | `/auth/doctor/me` | Bearer token | Returns current doctor |

### POST /auth/login
```json
Body: { "email": "admin@sahatghar.pk", "password": "SahatGhar@2025!" }
Response: { "success": true, "data": { "user": {...}, "admin": {...} } }
```

### POST /auth/doctor/login
```json
Body: { "email": "ayesha.noor@sahatghar.pk", "password": "Doctor@2025!" }
Response: { "success": true, "data": { "token": "jwt...", "doctor": {...} } }
```

---

## Dashboard

All require `requireAuth`.

| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/stats` | KPI counts (doctors, patients, revenue, appointments) |
| GET | `/dashboard/activity` | Recent audit log entries |
| GET | `/dashboard/revenue-trend` | Monthly revenue from payments table |
| GET | `/dashboard/verification-queue` | Doctors with PENDING/UNDER_REVIEW verification |

---

## Doctors

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/doctors` | requireAuth | List with pagination, search, filter |
| GET | `/doctors/stats` | requireAuth | Count by status |
| GET | `/doctors/:id` | requireAuth | Doctor detail |
| PATCH | `/doctors/:id` | requireAuth | Update doctor fields |
| GET | `/doctors/:id/verification` | requireAuth | Verification record |
| POST | `/doctors/:id/verification/approve` | VERIFIER_AND_ABOVE | Approve verification |
| POST | `/doctors/:id/verification/reject` | VERIFIER_AND_ABOVE | Reject with reason |
| PATCH | `/doctors/:id/status` | SUPER_ADMIN, ADMIN | Suspend/activate doctor |

---

## Patients

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/patients` | requireAuth | List with pagination |
| GET | `/patients/stats` | requireAuth | Count by status |
| GET | `/patients/:id` | requireAuth | Patient detail |
| PATCH | `/patients/:id/status` | SUPER_ADMIN, ADMIN, SUPPORT | Update patient status |

---

## Appointments

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/appointments` | requireAuth | List with pagination, date/status filter |
| GET | `/appointments/stats` | requireAuth | Count by status |
| GET | `/appointments/:id` | requireAuth | Appointment detail |
| PATCH | `/appointments/:id/status` | SUPER_ADMIN, ADMIN, SUPPORT | Update status |

---

## Payments

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/payments` | requireAuth | List with pagination |
| GET | `/payments/:id` | requireAuth | Payment detail |

---

## Refunds

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/refunds` | requireAuth | List with pagination |
| GET | `/refunds/stats` | requireAuth | Count by status |
| GET | `/refunds/:id` | requireAuth | Refund detail |
| PATCH | `/refunds/:id` | FINANCE_AND_ABOVE | Approve/reject refund |

---

## Payouts

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/payouts` | requireAuth | List with pagination |
| GET | `/payouts/stats` | requireAuth | Count by status |
| GET | `/payouts/:id` | requireAuth | Payout detail |
| PATCH | `/payouts/:id` | FINANCE_AND_ABOVE | Process/reject payout |

---

## Clinics

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/clinics` | requireAuth | List |
| GET | `/clinics/:id` | requireAuth | Clinic detail |
| POST | `/clinics` | SUPER_ADMIN, ADMIN | Create clinic |
| PATCH | `/clinics/:id` | SUPER_ADMIN, ADMIN | Update clinic |
| DELETE | `/clinics/:id` | SUPER_ADMIN | Logical delete (sets status) |

---

## Support Tickets

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/support/tickets` | requireAuth | List with pagination, status filter |
| GET | `/support/stats` | requireAuth | Count by status/priority |
| GET | `/support/tickets/:id` | requireAuth | Ticket + replies |
| PATCH | `/support/tickets/:id` | SUPPORT_AND_ABOVE | Update status/assignment |
| POST | `/support/tickets/:id/reply` | SUPPORT_AND_ABOVE | Add reply (internal or public) |

---

## Reviews

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reviews` | requireAuth | List with pagination |
| GET | `/reviews/stats` | requireAuth | Count by status/rating |
| GET | `/reviews/:id` | requireAuth | Review detail |
| PATCH | `/reviews/:id` | SUPER_ADMIN, ADMIN, SUPPORT | Approve/reject/hide |

---

## Admin Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin-users` | SUPER_ADMIN, ADMIN | List all admin users |
| POST | `/admin-users` | SUPER_ADMIN | Create new admin user |
| PATCH | `/admin-users/:id/status` | SUPER_ADMIN | Activate/deactivate |
| PATCH | `/admin-users/:id/role` | SUPER_ADMIN | Change role |

---

## Notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | requireAuth | List notifications for current user |
| GET | `/notifications/unread-count` | requireAuth | Count of unread |
| PATCH | `/notifications/:id/read` | requireAuth | Mark single as read |
| POST | `/notifications/mark-all-read` | requireAuth | Mark all as read |

---

## Audit Logs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/audit/logs` | requireAuth | List with pagination |
| GET | `/audit/stats` | requireAuth | Count by action/entity |

---

## Subscriptions ⚠️ MOCK DATA

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/subscriptions/plans` | requireAuth | **Returns hardcoded mock array** |
| GET | `/subscriptions/stats` | requireAuth | **Calculated from mock data** |
| GET | `/subscriptions` | requireAuth | **Returns empty list** |

> These routes use hardcoded mock data. They need to be connected to a real subscriptions table when subscription management is implemented.

---

## Pagination

Routes that return lists accept these query params:

| Param | Default | Notes |
|---|---|---|
| `page` | 1 | Page number |
| `limit` | 20 | Items per page |
| `search` | — | Text search (varies by route) |
| `status` | — | Filter by status |

Response format:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```
