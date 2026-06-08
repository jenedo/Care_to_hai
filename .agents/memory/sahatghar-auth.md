---
name: SahatGhar auth flow
description: Real JWT httpOnly cookie auth for admin and doctor portals; seed credentials.
---

## Admin login
- Endpoint: POST /api/auth/login (email, password)
- Returns httpOnly cookie `token` + user object
- GET /api/auth/me to check session (credentials: "include")
- POST /api/auth/logout clears cookie

## Doctor login
- Endpoint: POST /api/auth/doctor/login (email, password)
- Returns JWT token in response body + httpOnly cookie `doctor_token`
- GET /api/auth/doctor/me with Authorization: Bearer <token>
- Doctor app reads token from AsyncStorage (key: "sahatghar_doctor_token")

## Seed credentials (run: pnpm --filter @workspace/api-server run seed)
- superadmin@sahatghar.pk / SahatGhar@2025! (SUPER_ADMIN)
- admin@sahatghar.pk / SahatGhar@2025! (ADMIN)
- finance@sahatghar.pk / SahatGhar@2025! (FINANCE)
- support@sahatghar.pk / SahatGhar@2025! (SUPPORT)
- verifier@sahatghar.pk / SahatGhar@2025! (VERIFICATION_OFFICER)
- ayesha.noor@sahatghar.pk / Doctor@2025! (first VERIFIED doctor)

## AdminUser type in admin frontend
{ id, adminId, email, fullName, role, avatarUrl }
(NOT the old Supabase User type — no user_metadata, no session, no identities)

**Why:** Previous code used Supabase client mock auth. All auth is now backed by real DB with bcrypt + JWT.
