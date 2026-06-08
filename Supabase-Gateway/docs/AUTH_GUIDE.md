# AUTH_GUIDE.md

## Two Auth Systems

This project has two separate authentication systems — one for admin users, one for doctors.

---

## 1. Admin Auth (Cookie-based JWT)

### Login Flow

```
POST /api/auth/login
Body: { email, password }

→ Looks up users + admin_users tables
→ Verifies bcryptjs password hash
→ Signs JWT (7d expiry)
→ Sets httpOnly cookie named "token"
→ Returns { success: true, data: { user, admin } }
```

### Session Check

```
GET /api/auth/me
Cookie: token=<jwt>

→ Validates JWT from cookie
→ Returns current admin user info
```

### Logout

```
POST /api/auth/logout
→ Clears the "token" cookie
```

### Cookie Properties

- **Name:** `token`
- **httpOnly:** Yes (not accessible to JavaScript)
- **Sent via:** Browser cookie header automatically
- **Frontend uses:** `credentials: "include"` on all fetch calls

### Frontend AuthContext (`src/contexts/AuthContext.tsx`)

```ts
// On mount: check session
GET /api/auth/me → sets user state

// Login
POST /api/auth/login → sets user state

// Logout
POST /api/auth/logout → clears user state, redirects to /login
```

All admin routes in `App.tsx` are wrapped in a protected route component that redirects to `/login` if `user` is null.

---

## 2. Doctor Auth (Bearer Token JWT)

### Login Flow

```
POST /api/auth/doctor/login
Body: { email, password }

→ Looks up doctors + users tables
→ Verifies bcryptjs password hash
→ Signs JWT (7d expiry)
→ Returns { token, doctor } in response body
```

### Session Check

```
GET /api/auth/doctor/me
Header: Authorization: Bearer <token>

→ Validates JWT from header
→ Returns doctor info
```

### Token Storage (Doctor App)

- Stored in `AsyncStorage` with key `sahatghar_doctor_token`
- Read on app launch in `_layout.tsx`
- Attached to every request: `Authorization: Bearer <token>`
- Cleared on logout

### Doctor App AuthContext (`contexts/AuthContext.tsx`)

```ts
// On mount: read AsyncStorage → call /api/auth/doctor/me
// Login: POST /api/auth/doctor/login → store token → set doctor state
// Logout: remove AsyncStorage key → clear state
```

---

## JWT Implementation

**File:** `artifacts/api-server/src/lib/jwt.ts`

```ts
const JWT_SECRET = process.env.JWT_SECRET ?? "sahatghar-dev-secret-2025-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface JWTPayload {
  userId: string;
  adminId: string;    // for admin tokens
  email: string;
  fullName: string;
  role: string;
}

signToken(payload)   → string
verifyToken(token)   → JWTPayload | null
```

**CRITICAL:** Set `JWT_SECRET` in Replit Secrets before production deploy. The fallback secret is public.

---

## Password Hashing

**Library:** `bcryptjs` (pure JS, no native compilation required)
**Cost factor:** 12

```ts
// Hash
const hash = await bcrypt.hash(password, 12);

// Verify
const valid = await bcrypt.compare(password, hash);
```

> Do NOT switch back to `bcrypt` — it fails to build on Replit/Linux.

---

## RBAC — Role-Based Access Control

### Admin Roles (in `admin_users.role`)

| Role | Access Level |
|---|---|
| `SUPER_ADMIN` | Full access to everything |
| `ADMIN` | Most operations except some SUPER_ADMIN-only actions |
| `FINANCE` | Refunds, payouts |
| `SUPPORT` | Support tickets, some patient/appointment ops |
| `VERIFICATION_OFFICER` | Doctor verification approve/reject |

### Middleware

**File:** `artifacts/api-server/src/middlewares/auth.ts`

```ts
requireAuth          // Any authenticated admin
requireRole(...roles) // Specific roles only
```

### Role Group Constants

```ts
ALL_ROLES            // All admin roles
FINANCE_AND_ABOVE    // SUPER_ADMIN, ADMIN, FINANCE
SUPPORT_AND_ABOVE    // SUPER_ADMIN, ADMIN, SUPPORT
VERIFIER_AND_ABOVE   // SUPER_ADMIN, ADMIN, VERIFICATION_OFFICER
```

---

## Dev Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@sahatghar.pk | SahatGhar@2025! |
| Admin | admin@sahatghar.pk | SahatGhar@2025! |
| Doctor | ayesha.noor@sahatghar.pk | Doctor@2025! |

These are seeded by `artifacts/api-server/src/seed.ts`. Never use in production.
