---
name: Mobile email-login uses bcrypt not Supabase Auth
description: Existing doctor/patient accounts have bcrypt hashes only; must NOT use Supabase Auth signInWithPassword.
---

All users seeded via `platform/artifacts/api-server/src/seed.ts` only have bcrypt
password hashes stored in the `users.password_hash` column. They were NOT created
in Supabase Auth, so `supabase.auth.signInWithPassword()` will always return
"Invalid login credentials" for these accounts.

**Fix in `mobileAuth.ts` email-login route:**
- Look up user by email in `usersTable`
- Compare password using `comparePassword(password, user.passwordHash)` from `lib/password.ts`
- Issue an internal JWT via `signToken()` — no Supabase session returned

**Why:** The migration is incremental — existing accounts keep bcrypt auth.
New accounts created via phone OTP will have `supabase_uid` set and can use
Supabase session tokens. Doctors who registered via admin dashboard use email+bcrypt.

**How to apply:** Any new "email login for mobile" route must go through bcrypt first.
Only newly OTP-registered users have Supabase Auth accounts.
