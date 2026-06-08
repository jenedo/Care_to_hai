---
name: SahatGhar Admin Auth
description: How authentication works in the SahatGhar admin panel — local bypass + Supabase fallback
---

## Rule
Admin login uses a **local bypass** in `AuthContext.tsx` for `admin@sahatghar.pk` / `SahatGhar@2025!`.
Session stored in `localStorage` key `sahatghar_admin_session = "admin"`.

**Why:** Supabase rejected `.pk` email domains at signup; email confirmation would block development.

**How to apply:** If adding more hardcoded admins, add checks in the `signIn()` function in `AuthContext.tsx`.
Real Supabase users (with confirmed emails) also work via the normal auth flow below the bypass.
