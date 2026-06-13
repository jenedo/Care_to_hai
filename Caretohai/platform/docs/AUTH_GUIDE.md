# AsaanCare — Authentication Guide

> Last updated: 2026-06-13

---

## Three Auth Systems

The platform has three separate auth systems — one per user type. They share the same JWT signing key (`JWT_SECRET`) but use different cookie/storage keys and different middleware.

| User type | Token name | Storage | Transport |
|---|---|---|---|
| Admin | `asaancare_admin_token` | httpOnly cookie | Cookie header (automatic) |
| Doctor | `asaancare_doctor_token` | AsyncStorage (Expo) | `Authorization: Bearer <token>` |
| Patient | `asaancare_patient_token` | AsyncStorage (Expo) | `Authorization: Bearer <token>` |

Cookie names are defined as constants in `artifacts/api-server/src/lib/cookies.ts`.

---

## Admin Auth (httpOnly Cookie)

### Login Flow

```
POST /api/auth/login
Body: { "email": "superadmin@asaancare.pk", "password": "AsaanCare@2025!" }

→ Looks up users + admin_users tables
→ Verifies password with bcryptjs.compare()
→ Signs JWT (7d expiry) with JWT_SECRET
→ Sets httpOnly cookie: asaancare_admin_token=<jwt>; HttpOnly; SameSite=Lax
→ Returns { success: true, data: { user: { id, email, role, fullName } } }
```

### Session Check

```
GET /api/auth/me
Cookie: asaancare_admin_token=<jwt>   ← sent automatically by browser

→ Reads cookie, verifies JWT
→ Returns current admin user object
```

### Logout

```
POST /api/auth/logout
→ Clears asaancare_admin_token cookie (maxAge: 0)
```

### Why httpOnly Cookie?

Admin panel runs in a browser. httpOnly cookies cannot be read by JavaScript — XSS attacks cannot steal the token. The browser sends the cookie automatically on every request to the same origin.

### Frontend Usage (`artifacts/admin-dashboard/src/`)

```ts
// Every fetch call must include credentials
fetch("/api/auth/me", { credentials: "include" })

// AuthContext checks session on mount
GET /api/auth/me → sets user state in React context

// Login
POST /api/auth/login → user state set → redirect to /dashboard

// Logout
POST /api/auth/logout → user state cleared → redirect to /login
```

All admin routes in `App.tsx` are wrapped in `<ProtectedRoute>` which redirects to `/login` if `user` is null.

---

## Doctor Auth (Bearer Token)

### Login Flow

```
POST /api/auth/doctor/login
Body: { "email": "ayesha.noor@asaancare.pk", "password": "Doctor@2025!" }

→ Looks up doctors table
→ Verifies password with bcryptjs.compare()
→ Signs JWT (7d expiry)
→ Returns { success: true, data: { token: "eyJ...", doctor: { id, fullName, specialty } } }
```

### Usage in Doctor App

```ts
// Login → store token
const { token } = response.data;
await AsyncStorage.setItem("asaancare_doctor_token", token);

// Every API call
const token = await AsyncStorage.getItem("asaancare_doctor_token");
fetch("/api/doctor/profile", {
  headers: { "Authorization": `Bearer ${token}` }
})

// Check session on app launch (_layout.tsx)
GET /api/auth/doctor/me
Authorization: Bearer <token>

// Logout
await AsyncStorage.removeItem("asaancare_doctor_token");
```

---

## Patient Auth (Bearer Token)

### Login Flow

```
POST /api/auth/patient/login
Body: { "email": "patient@example.com", "password": "..." }

→ Looks up patients table
→ Signs JWT
→ Returns { success: true, data: { token: "eyJ...", patient: { id, fullName } } }
```

### Usage in Patient App

Same pattern as doctor app:
```ts
await AsyncStorage.setItem("asaancare_patient_token", token);
// Every request: Authorization: Bearer <token>
// On launch: GET /api/auth/patient/me
// Logout: AsyncStorage.removeItem("asaancare_patient_token")
```

---

## JWT Implementation

**File:** `artifacts/api-server/src/lib/jwt.ts`

```ts
const JWT_SECRET = process.env.JWT_SECRET ?? "asaancare-dev-secret-change-in-production";
// CRITICAL: In production, always set JWT_SECRET to a random 64-char string

export function signToken(payload: object): string
export function verifyToken(token: string): JWTPayload | null
```

**Token payload shape:**
```ts
{
  userId: string;      // user/doctor/patient table ID
  email: string;
  fullName: string;
  role: string;        // "ADMIN", "DOCTOR", "PATIENT"
  // admin-only:
  adminId?: string;
  adminRole?: string;  // "SUPER_ADMIN", "ADMIN", "FINANCE", "SUPPORT", "VERIFICATION_OFFICER"
}
```

**Expiry:** 7 days. No refresh token system — mobile apps re-login after expiry.

---

## Auth Middleware

**File:** `artifacts/api-server/src/middlewares/auth.ts`

| Middleware | Checks | Extracts |
|---|---|---|
| `requireAuth` | Admin JWT in cookie | `req.admin` |
| `requireRole(...roles)` | Admin JWT + specific role | `req.admin` |
| `requireDoctorAuth` | Doctor JWT in Bearer header | `req.doctor` |
| `requirePatientAuth` | Patient JWT in Bearer header | `req.patient` |
| `requireDoctorOrPatientAuth` | Doctor OR Patient Bearer JWT | `req.doctor` or `req.patient` |
| `requireAnyAuth` | Admin cookie OR Doctor/Patient Bearer | whichever matched |

Each middleware reads the token from its expected location, verifies with `verifyToken()`, fetches the user from DB, and attaches to `req`. Returns `401` if token is missing/invalid, `403` if role is wrong.

**Bearer token extraction:** Reads the `Authorization: Bearer <token>` header. Also accepts the token in the cookie named `asaancare_doctor_token` or `asaancare_patient_token` as a fallback.

---

## RBAC — Admin Roles

| Role | What they can do |
|---|---|
| `SUPER_ADMIN` | Everything — all routes, all actions |
| `ADMIN` | Most operations; cannot manage other super admins |
| `FINANCE` | Approve/reject refunds, process payouts |
| `SUPPORT` | Manage support tickets, update patient/appointment status |
| `VERIFICATION_OFFICER` | Approve/reject doctor verification applications |

### Role Group Constants (`middlewares/auth.ts`)

```ts
FINANCE_AND_ABOVE    // SUPER_ADMIN, ADMIN, FINANCE
SUPPORT_AND_ABOVE    // SUPER_ADMIN, ADMIN, SUPPORT
VERIFIER_AND_ABOVE   // SUPER_ADMIN, ADMIN, VERIFICATION_OFFICER
```

---

## Password Hashing

**Library:** `bcryptjs` (pure JavaScript — no native compilation)
**Cost factor:** 12

```ts
import bcrypt from "bcryptjs";

// Hash on registration/creation
const hash = await bcrypt.hash(plainPassword, 12);

// Verify on login
const valid = await bcrypt.compare(plainPassword, storedHash);
```

**Critical:** Never replace `bcryptjs` with `bcrypt`. The `bcrypt` package requires native build tools (`node-gyp`, `libssl-dev`) that are not available on Replit/Linux containers. See `DECISIONS.md` DEC-001.

---

## Generating a Secure JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Set the output as the `JWT_SECRET` environment variable / Replit Secret before any production deployment.

---

## Dev Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@asaancare.pk | AsaanCare@2025! |
| Admin | admin@asaancare.pk | AsaanCare@2025! |
| Finance | finance@asaancare.pk | AsaanCare@2025! |
| Support | support@asaancare.pk | AsaanCare@2025! |
| Verifier | verifier@asaancare.pk | AsaanCare@2025! |
| Doctor | ayesha.noor@asaancare.pk | Doctor@2025! |

Seeded by `artifacts/api-server/src/seed.ts`. **Never use these credentials in production.**
