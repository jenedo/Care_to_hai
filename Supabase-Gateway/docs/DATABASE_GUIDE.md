# DATABASE_GUIDE.md

## Connection Setup

**File:** `Supabase-Gateway/lib/db/src/index.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export { pool };
```

The `db` and `pool` exports are re-exported from `artifacts/api-server/src/lib/db.ts` for use in routes.

---

## ORM: Drizzle

- **Dialect:** PostgreSQL
- **Config:** `lib/db/drizzle.config.ts`
- **Schema dir:** `lib/db/src/schema/`

### Useful Commands

```bash
cd Supabase-Gateway

# Push schema changes to DB (dev, no migration file)
pnpm --filter @workspace/db run push

# Generate migration files (production-safe)
pnpm --filter @workspace/db run generate

# Apply migration files
pnpm --filter @workspace/db run migrate

# Open Drizzle Studio (DB browser)
pnpm --filter @workspace/db run studio
```

---

## UUID Pattern

> **Important:** Do NOT use `.default("gen_random_uuid()")` in Drizzle schema — this stores the literal string.

**Correct pattern:**
```ts
import { randomUUID } from "node:crypto";

id: text("id").primaryKey().$defaultFn(() => randomUUID()),
```

---

## Schema Overview

### users
| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID via randomUUID() |
| email | text unique | |
| phone | text | |
| full_name | text | |
| password_hash | text | bcryptjs hash |
| role | enum | PATIENT, DOCTOR, ADMIN, CLINIC_STAFF |
| status | enum | ACTIVE, INACTIVE, SUSPENDED, DELETED |
| avatar_url | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

### admin_users
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| user_id | text FK → users.id | |
| role | enum | SUPER_ADMIN, ADMIN, SUPPORT, FINANCE, VERIFICATION_OFFICER |
| permissions | text[] | |
| is_active | boolean | |
| last_login_at | timestamp | |

### doctors
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| user_id | text FK → users.id | |
| full_name, phone, email | text | |
| gender | enum | |
| specialty | text | |
| qualifications | text[] | |
| experience_years | int | |
| consultation_fee | numeric | |
| city, area | text | |
| pmdc_number | text | Pakistan Medical & Dental Council reg# |
| verification_status | enum | PENDING, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED |
| profile_status | enum | |
| rating | numeric | |
| total_reviews | int | |
| appointments_completed | int | |
| is_available_online | boolean | |
| is_featured | boolean | |

### doctor_verifications
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| doctor_id | text FK → doctors.id | |
| pmdc_number | text | |
| cnic_front_url | text | document upload URL |
| cnic_back_url | text | document upload URL |
| degree_url | text | document upload URL |
| certificate_url | text[] | |
| status | enum | Mirrors verification_status |
| submitted_at | timestamp | |
| reviewed_at | timestamp | |
| reviewed_by_admin_id | text | |
| rejection_reason | text | |
| notes | text | |

### clinics
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| name, phone, address | text | |
| city, area | text | |
| status | enum | ACTIVE, INACTIVE, SUSPENDED |

### doctor_clinics (M-M join)
| Column | Type | Notes |
|---|---|---|
| doctor_id | FK → doctors.id | |
| clinic_id | FK → clinics.id | |
| consultation_fee | numeric | per-clinic fee |
| is_active | boolean | |

### doctor_availability
| Column | Type | Notes |
|---|---|---|
| doctor_id | FK → doctors.id | |
| day_of_week | enum | |
| start_time, end_time | text | "HH:MM" format |
| slot_duration_minutes | int | |
| consultation_type | enum | ONLINE, CLINIC, BOTH |
| is_active | boolean | |

### appointments
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| patient_id, patient_name, patient_phone | text | denormalized |
| patient_age | int | |
| patient_gender | enum | |
| doctor_id | FK → doctors.id | |
| doctor_name, doctor_specialty | text | denormalized |
| clinic_id | FK → clinics.id | nullable |
| appointment_date | timestamp | |
| start_time, end_time | text | |
| consultation_type | enum | |
| status | enum | PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW |
| payment_status | enum | |
| fee | numeric | |
| platform_commission | numeric | |
| doctor_earning | numeric | |
| cancellation_reason | text | |

### payments
| Column | Type | Notes |
|---|---|---|
| appointment_id | FK → appointments.id | |
| patient_id, patient_name | text | denormalized |
| doctor_id | FK → doctors.id | |
| doctor_name | text | denormalized |
| amount | numeric | |
| method | enum | CARD, BANK_TRANSFER, EASYPAISA, JAZZCASH, CASH |
| status | enum | PENDING, COMPLETED, FAILED, REFUNDED |
| transaction_ref | text | |

### refunds
| Column | Type | Notes |
|---|---|---|
| payment_id | FK → payments.id | |
| appointment_id | FK → appointments.id | |
| amount | numeric | |
| reason | text | |
| status | enum | PENDING, APPROVED, REJECTED, PROCESSED |
| reviewed_by_admin_id | text | |
| admin_notes | text | |

### doctor_payouts
| Column | Type | Notes |
|---|---|---|
| doctor_id | FK → doctors.id | |
| doctor_name | text | denormalized |
| amount | numeric | |
| status | enum | PENDING, PROCESSING, COMPLETED, FAILED |
| bank_name, account_title, account_number | text | |
| iban | text | |
| wallet_provider, wallet_number | text | Easypaisa / JazzCash |
| processed_by_admin_id | text | |
| admin_notes | text | |

### patients
| Column | Type | Notes |
|---|---|---|
| user_id | FK → users.id | |
| full_name, phone, email | text | |
| date_of_birth | timestamp | |
| gender | enum | |
| blood_group | enum | A+, A-, B+, B-, AB+, AB-, O+, O- |
| city, area, address | text | |
| emergency_contact | text | |
| total_appointments | int | |
| status | enum | |

### reviews
| Column | Type | Notes |
|---|---|---|
| appointment_id | FK → appointments.id | |
| patient_id, patient_name | text | denormalized |
| doctor_id | FK → doctors.id | |
| doctor_name | text | denormalized |
| rating | int | 1–5 |
| comment | text | |
| status | enum | PENDING, APPROVED, REJECTED, HIDDEN |

### support_tickets
| Column | Type | Notes |
|---|---|---|
| user_id, user_name, user_email | text | |
| user_role | text | |
| subject, description | text | |
| category | enum | |
| priority | enum | LOW, MEDIUM, HIGH, URGENT |
| status | enum | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| assigned_to_admin_id, assigned_to_admin_name | text | |

### ticket_replies
| Column | Type | Notes |
|---|---|---|
| ticket_id | FK → support_tickets.id | |
| author_id, author_name, author_role | text | |
| message | text | |
| is_internal | text | "true"/"false" (text, not boolean) |

### audit_logs
| Column | Type | Notes |
|---|---|---|
| actor_id, actor_name, actor_role | text | who did the action |
| action | text | e.g. "APPROVED_DOCTOR" |
| entity_type | text | e.g. "doctor" |
| entity_id | text | |
| old_value, new_value | jsonb | before/after state |
| ip_address, user_agent | text | |

### notifications
| Column | Type | Notes |
|---|---|---|
| user_id | text | target user |
| title, message | text | |
| type | enum | notification_type |
| channel | enum | notification_channel |
| status | enum | notification_status |
| entity_type, entity_id | text | linked entity |
| read_at | timestamp | null = unread |
