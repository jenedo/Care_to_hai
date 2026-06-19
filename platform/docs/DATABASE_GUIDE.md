# AsaanCare — Database Guide

> Last updated: 2026-06-13
> ORM: Drizzle · Database: PostgreSQL · Schema dir: `lib/db/src/schema/`

---

## Connection

**File:** `lib/db/src/index.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export { pool };
```

Re-exported from `artifacts/api-server/src/lib/db.ts` for use in all route files.

---

## Schema Commands

Run from inside `platform/`:

```bash
# DEV: Push schema directly to DB (no migration files)
pnpm --filter @asaancare/db run push

# PROD: Generate migration SQL files (safe for production)
pnpm --filter @asaancare/db run generate

# Apply generated migration files
pnpm --filter @asaancare/db run migrate

# Open Drizzle Studio (visual DB browser)
pnpm --filter @asaancare/db run studio
```

Or from workspace root:
```bash
npm run db:push   # = pnpm --filter @asaancare/db run push
```

---

## UUID Pattern — CRITICAL

**Never** use `.default("gen_random_uuid()")` — Drizzle stores this as the literal string `"gen_random_uuid()"`, not an actual UUID.

**Correct pattern for all tables:**
```ts
import { randomUUID } from "node:crypto";

id: text("id").primaryKey().$defaultFn(() => randomUUID()),
```

---

## Schema Reference

### admins / users

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID via randomUUID() |
| `email` | text unique | |
| `phone` | text | |
| `full_name` | text | |
| `password_hash` | text | bcryptjs, cost 12 |
| `role` | text | PATIENT, DOCTOR, ADMIN |
| `status` | text | ACTIVE, INACTIVE, SUSPENDED, DELETED |
| `avatar_url` | text | |
| `created_at` | timestamp | auto |
| `updated_at` | timestamp | auto |

#### `admin_users`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK → users.id | |
| `role` | text | SUPER_ADMIN, ADMIN, FINANCE, SUPPORT, VERIFICATION_OFFICER |
| `permissions` | text[] | fine-grained permissions (future) |
| `is_active` | boolean | |
| `last_login_at` | timestamp | |

---

### Doctors

#### `doctors`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK → users.id | nullable (admin-created doctors) |
| `full_name`, `phone`, `email` | text | |
| `gender` | text | MALE, FEMALE, OTHER |
| `specialty` | text | e.g. "Cardiology" |
| `qualifications` | text[] | |
| `experience_years` | integer | |
| `consultation_fee` | numeric | in PKR |
| `city`, `area` | text | |
| `pmdc_number` | text | Pakistan Medical & Dental Council registration |
| `verification_status` | text | PENDING, IN_REVIEW, VERIFIED, REJECTED, SUSPENDED |
| `online_status` | text | ONLINE, OFFLINE, BUSY |
| `last_seen_at` | timestamp | updated by heartbeat |
| `rating` | numeric | 1.0–5.0 |
| `total_reviews` | integer | |
| `appointments_completed` | integer | |
| `is_featured` | boolean | shown first in search |
| `bio` | text | |

#### `doctor_verifications`
| Column | Type | Notes |
|---|---|---|
| `doctor_id` | FK → doctors.id | |
| `pmdc_number` | text | |
| `cnic_front_url`, `cnic_back_url` | text | document URLs (Appwrite Storage in prod) |
| `degree_url`, `certificate_url` | text | document URLs |
| `status` | text | mirrors doctor verification_status |
| `submitted_at`, `reviewed_at` | timestamp | |
| `reviewed_by_admin_id` | text | |
| `rejection_reason` | text | |
| `notes` | text | internal admin notes |

#### `doctor_clinics` (M-M join)
| Column | Type |
|---|---|
| `doctor_id` | FK → doctors.id |
| `clinic_id` | FK → clinics.id |
| `consultation_fee` | numeric |
| `is_active` | boolean |

---

### Consultation System

#### `consultation_sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `patient_id` | FK → patients.id | |
| `doctor_id` | FK → doctors.id | |
| `request_id` | text | FK → consultation_requests.id |
| `status` | text | WAITING, ACTIVE, COMPLETED, CANCELLED |
| `is_free_session` | boolean | true = covered by free trial |
| `amount_charged` | numeric | 0 for free, 75 for paid continuation |
| `started_at` | timestamp | when doctor accepted |
| `ended_at` | timestamp | when completed |
| `created_at` | timestamp | |

#### `session_messages`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `session_id` | FK → consultation_sessions.id | |
| `sender_type` | text | DOCTOR, PATIENT |
| `sender_id` | text | |
| `content` | text | message body |
| `created_at` | timestamp | |

#### `consultation_requests`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `patient_id` | FK → patients.id | |
| `doctor_id` | FK → doctors.id | |
| `status` | text | PENDING, ACCEPTED, REJECTED, EXPIRED |
| `created_at` | timestamp | |

#### `free_trial_records`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `patient_id` | text | |
| `week_start` | timestamp | Monday 00:00 UTC of the week |
| `session_id` | FK → consultation_sessions.id | |
| `created_at` | timestamp | |

One record per patient per week. Checked before creating a session to enforce the 1-free-session-per-week rule.

#### `card_verifications`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `patient_id` | text | |
| `card_last_four` | text | |
| `is_verified` | boolean | |
| `created_at` | timestamp | |

---

### Subscriptions

#### `subscription_plans`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `name` | text | Basic, Care, Family, Premium |
| `price` | numeric | 0, 599, 999, 1499 (PKR) |
| `billing_period` | text | MONTHLY |
| `is_active` | boolean | |
| `features` | jsonb | see structure below |
| `created_at` | timestamp | |

**`features` JSONB structure:**
```json
{
  "tier": "STANDARD",
  "badge": "Most Popular",
  "payPerUse": false,
  "maxMembers": 1,
  "chatSessions": 2,
  "audioSessions": 1,
  "videoSessions": 1,
  "features": [
    "2 chat + 1 audio + 1 video/month",
    "Full medical records vault",
    "Prescription management",
    "Medicine reminders",
    "Secure messaging"
  ]
}
```

#### `patient_subscriptions`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `patient_id` | FK → patients.id | |
| `plan_id` | FK → subscription_plans.id | |
| `status` | text | ACTIVE, CANCELLED, EXPIRED |
| `started_at`, `expires_at` | timestamp | |
| `chat_sessions_used` | integer | this billing period |
| `audio_sessions_used` | integer | |
| `video_sessions_used` | integer | |

---

### Patients

#### `patients`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | FK → users.id | nullable |
| `full_name`, `phone`, `email` | text | |
| `date_of_birth` | timestamp | |
| `gender` | text | MALE, FEMALE, OTHER |
| `blood_group` | text | A+, A-, B+, B-, AB+, AB-, O+, O- |
| `city`, `area`, `address` | text | |
| `emergency_contact` | text | |
| `total_appointments` | integer | |
| `status` | text | ACTIVE, INACTIVE, SUSPENDED, DELETED |

---

### Appointments / Payments

#### `appointments`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `patient_id`, `patient_name`, `patient_phone` | text | denormalized |
| `doctor_id` | FK → doctors.id | |
| `doctor_name`, `doctor_specialty` | text | denormalized |
| `clinic_id` | FK → clinics.id | nullable |
| `appointment_date` | timestamp | |
| `consultation_type` | text | ONLINE, CLINIC |
| `status` | text | PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW |
| `fee`, `platform_commission`, `doctor_earning` | numeric | PKR amounts |

#### `payments`
| Column | Type | Notes |
|---|---|---|
| `appointment_id` | FK → appointments.id | |
| `amount` | numeric | |
| `method` | text | CARD, BANK_TRANSFER, EASYPAISA, JAZZCASH, CASH |
| `status` | text | PENDING, COMPLETED, FAILED, REFUNDED |
| `transaction_ref` | text | |

#### `refunds`
| Column | Type | Notes |
|---|---|---|
| `payment_id` | FK → payments.id | |
| `amount` | numeric | |
| `reason` | text | |
| `status` | text | PENDING, APPROVED, REJECTED, PROCESSED |
| `reviewed_by_admin_id` | text | |

#### `doctor_payouts`
| Column | Type | Notes |
|---|---|---|
| `doctor_id` | FK → doctors.id | |
| `amount` | numeric | |
| `status` | text | PENDING, PROCESSING, COMPLETED, FAILED |
| `bank_name`, `account_number`, `iban` | text | bank transfer |
| `wallet_provider`, `wallet_number` | text | Easypaisa / JazzCash |

---

### Support / Reviews / Audit

#### `support_tickets`
| Column | Type |
|---|---|
| `user_id`, `user_name`, `user_email` | text |
| `subject`, `description` | text |
| `category` | text |
| `priority` | text (LOW, MEDIUM, HIGH, URGENT) |
| `status` | text (OPEN, IN_PROGRESS, RESOLVED, CLOSED) |
| `assigned_to_admin_id` | text |

#### `ticket_replies`
| Column | Type | Notes |
|---|---|---|
| `ticket_id` | FK → support_tickets.id | |
| `message` | text | |
| `is_internal` | text | "true"/"false" — stored as text (known issue) |

#### `reviews`
| Column | Type |
|---|---|
| `appointment_id` | FK → appointments.id |
| `patient_id`, `patient_name` | text |
| `doctor_id` | FK → doctors.id |
| `rating` | integer (1–5) |
| `comment` | text |
| `status` | text (PENDING, APPROVED, REJECTED, HIDDEN) |

#### `clinics`
| Column | Type |
|---|---|
| `name`, `phone`, `address` | text |
| `city`, `area` | text |
| `status` | text (ACTIVE, INACTIVE, SUSPENDED) |

#### `audit_logs`
| Column | Notes |
|---|---|
| `actor_id`, `actor_name`, `actor_role` | who did it |
| `action` | e.g. "APPROVED_DOCTOR", "REJECTED_REFUND" |
| `entity_type`, `entity_id` | what was affected |
| `old_value`, `new_value` | jsonb before/after |

#### `notifications`
| Column | Notes |
|---|---|
| `user_id` | target user |
| `title`, `message` | content |
| `type`, `channel`, `status` | enums |
| `read_at` | null = unread |

---

## Drizzle Query Patterns

```ts
import { db } from "../lib/db";
import { doctorsTable, patientsTable } from "@asaancare/db";
import { eq, ilike, desc, and, count } from "drizzle-orm";

// Single record
const doctor = await db.query.doctorsTable.findFirst({
  where: eq(doctorsTable.id, id),
});

// Paginated list with search
const [rows, [{ total }]] = await Promise.all([
  db.select().from(doctorsTable)
    .where(search ? ilike(doctorsTable.fullName, `%${search}%`) : undefined)
    .orderBy(desc(doctorsTable.createdAt))
    .limit(limit).offset((page - 1) * limit),
  db.select({ total: count() }).from(doctorsTable),
]);

// Insert
const [newDoctor] = await db.insert(doctorsTable).values({ ...data }).returning();

// Update
await db.update(doctorsTable).set({ status: "SUSPENDED" }).where(eq(doctorsTable.id, id));

// Delete (logical)
await db.update(doctorsTable).set({ status: "DELETED" }).where(eq(doctorsTable.id, id));
```

Use the `paginate()` helper from `lib/pagination.ts` for consistent pagination across routes.
