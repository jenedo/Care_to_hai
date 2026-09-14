# Incident: Authentication or identity resolution failure

## Purpose

Recover from widespread authentication failures involving Clerk-backed doctor/patient access, admin authentication, or Clerk-to-database identity synchronization.

## Impact

Users may be unable to authenticate or may receive authorization failures across protected API routes. Clerk webhook failures can also prevent new Clerk users from being synchronized into application records.

## Symptoms

- Protected routes return `401` with `UNAUTHORIZED`, `INVALID_TOKEN`, or `ACCOUNT_NOT_FOUND`.
- Valid users receive `403` with `FORBIDDEN` because no matching application role/identity can be resolved from PostgreSQL.
- `POST /api/webhooks/clerk` returns `503` when `CLERK_WEBHOOK_SECRET` is not configured.
- Clerk webhook requests return `400` and logs contain `Clerk webhook verification failed`.
- Authentication endpoints are rate limited with HTTP `429` after repeated attempts.

## Severity

P1 for widespread login or identity-resolution outage. Escalate to P0 if authentication controls are bypassed, privileges are incorrectly granted, tokens/secrets are exposed, or unauthorized access is confirmed.

## Immediate Actions

**SAFE AUTOMATION**

- Confirm `/api/healthz` is healthy so an API outage is not misdiagnosed as an auth outage.
- Review `asaancare-api` logs for `INVALID_TOKEN`, account lookup failures, Clerk webhook verification failures, and database errors.
- Determine whether failures affect admins, doctors, patients, or all roles.
- Check that the required environment variable names are present in the deployment configuration without printing values: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and, for webhook sync, `CLERK_WEBHOOK_SECRET`.

**REQUIRES HUMAN APPROVAL**

- Rotating Clerk or JWT credentials.
- Changing user roles or application identity records.
- Bypassing token verification, role checks, or webhook signature validation.
- Replaying or manually fabricating webhook events.

## Diagnosis

1. For `401 UNAUTHORIZED`, confirm the client is actually sending the expected bearer token/session rather than changing server controls.
2. For `401 INVALID_TOKEN`, determine whether the failure is isolated to expired client tokens or widespread across newly issued Clerk tokens.
3. For `401 ACCOUNT_NOT_FOUND`, verify the Clerk account still exists using the authorized Clerk operational interface; do not create replacement identities automatically.
4. For `403 FORBIDDEN`, check whether PostgreSQL identity resolution has a matching admin, doctor, or patient record. Admin access is intentionally based on database records rather than Clerk public metadata.
5. For new-user synchronization failures, inspect `/api/webhooks/clerk` responses and the log entry `Clerk webhook verification failed`. The route verifies Svix signatures with `CLERK_WEBHOOK_SECRET`.
6. If auth failures coincide with database errors, use `database-unavailable.md` first.
7. HTTP `429` can be expected during bursts: the API applies a stricter 20-request-per-15-minute limiter to selected authentication paths. Do not disable it as recovery.

## Recovery

- If the incident is caused by Clerk service availability, preserve existing security checks and follow the provider's approved recovery/status process. No repository-defined fail-open mode exists.
- If configuration is missing or invalid, correct it only through the approved deployment/secret-management process with human approval.
- If a database identity mapping is wrong, stop automated recovery and have an authorized operator verify the intended role before changing any record.
- If webhook delivery failed, use the provider's authorized delivery/retry mechanism only after validating the configured endpoint and signature secret. A repository-specific replay command is **NOT VERIFIED**.

## Validation

- `/api/healthz` returns HTTP 200.
- A known authorized doctor, patient, and/or admin can complete the affected authentication flow as appropriate to the incident.
- A representative protected endpoint returns success for the correct role and still returns `401`/`403` for unauthorized access.
- Clerk webhook requests no longer return `503`/`400` for correctly signed events.
- Authentication-related error volume returns to normal.

## Rollback

No verified rollback mechanism found.

## Escalation

Escalate immediately when:

- any user receives privileges they should not have;
- token verification appears bypassed;
- a Clerk/JWT/webhook secret may be exposed;
- recovery requires role changes, credential rotation, or identity-record edits;
- correct Clerk identities cannot be reconciled with PostgreSQL records safely.

## Do Not

- Do not disable Clerk verification, Svix webhook verification, role middleware, or rate limiting.
- Do not grant admin/doctor/patient roles based only on unverified client claims or Clerk public metadata.
- Do not log tokens, cookies, passwords, or secret values.
- Do not rotate unrelated credentials during diagnosis.

## Root Cause Follow-Up

- Record which role(s) and auth path failed.
- Confirm alerting distinguishes `401`, `403`, `429`, webhook `400`, and dependency `5xx` failures.
- Document the approved Clerk operational/replay process if one exists outside the repository.