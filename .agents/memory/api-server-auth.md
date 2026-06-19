---
name: API server auth middleware
description: Three auth middleware variants for doctor/patient/mixed routes in the Express API
---

## Middlewares (platform/artifacts/api-server/src/middlewares/auth.ts)
- `requireDoctorAuth` — validates doctor JWT; sets `(req as any).doctorAuth.doctorId`
- `requirePatientAuth` — validates patient JWT; sets `(req as any).patientAuth.patientId`
- `requireAnyAuth` — accepts either token type; use for shared endpoints like Agora token
- `requireAuth` — admin auth (used by admin-facing routes behind the admin router)

## Route registration order matters
Mobile-facing routes are registered BEFORE `router.use(requireAuth)` in `routes/index.ts`. This is intentional — the admin middleware would block doctor/patient JWTs.

## Why:
Mixing admin JWT check with mobile routes broke doctor/patient endpoints in early sessions.

## How to apply:
Always import and use `requireDoctorAuth` for doctor-only endpoints, never the generic `requireAuth`.
