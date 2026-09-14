# Incident: LiveKit consultation calls unavailable

## Purpose

Recover from failures generating LiveKit access tokens for AsaanCare audio/video consultation sessions.

## Impact

Authenticated doctors and patients may be unable to join consultation calls while the rest of the application remains available.

## Symptoms

- `POST /api/livekit/token` returns HTTP `503` with code `LIVEKIT_NOT_CONFIGURED`.
- The token endpoint returns HTTP `500` with `Failed to generate LiveKit token`.
- A valid consultation returns `404 Consultation session not found` or `403 Forbidden` when the issue is session/access data rather than LiveKit availability.
- `/api/healthz` can remain `ok` during a LiveKit incident.

## Severity

P1 when active consultation calls are broadly unavailable.

## Immediate Actions

**SAFE AUTOMATION**

- Confirm `/api/healthz` is healthy.
- Review `asaancare-api` logs around failing `/api/livekit/token` requests.
- Determine whether failures are `503`, `500`, `404`, `403`, or authentication-related before changing anything.
- Verify presence, without printing values, of `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in deployment configuration.

**REQUIRES HUMAN APPROVAL**

- Rotating LiveKit credentials.
- Changing LiveKit project/infrastructure configuration.
- Altering consultation records or access-control logic.

## Diagnosis

1. A `503 LIVEKIT_NOT_CONFIGURED` directly indicates that one or more required LiveKit environment variables are empty in the running API process.
2. A `401`/authentication failure should be handled with `authentication-failure.md`.
3. A `404 Consultation session not found` means the requested room name does not match a stored consultation session; do not create records automatically.
4. A `403 Forbidden` means the authenticated identity is not authorized for that session; do not bypass `canAccessConsultationSession`.
5. A `500 Failed to generate LiveKit token` after successful authentication/session lookup can indicate credential or provider-side failure. Check the authorized LiveKit operational interface/status source.
6. If database queries are failing at the same time, use `database-unavailable.md` first.

## Recovery

- For provider availability issues, preserve access controls and use the approved LiveKit provider recovery/status process.
- For missing or invalid LiveKit configuration, correction requires human approval through the authorized secret/deployment process.
- For incorrect consultation/session data, escalate to an authorized application/data operator rather than creating or changing production records automatically.

## Validation

- `/api/healthz` returns HTTP 200.
- For an existing authorized consultation session, `/api/livekit/token` returns a token response rather than `503`/`500`.
- An authorized participant can join the intended room.
- An unrelated user remains unable to obtain a token for that room.
- New LiveKit token-generation errors stop appearing.

## Rollback

No verified rollback mechanism found.

## Escalation

Escalate when:

- calls remain unavailable after provider health and configuration presence are confirmed;
- recovery requires credential/project changes;
- access-control behavior appears incorrect;
- session data appears missing or corrupted.

## Do Not

- Do not bypass consultation access checks.
- Do not issue tokens for arbitrary room names to test production.
- Do not expose LiveKit keys, secrets, or generated tokens in logs or incident notes.
- Do not modify consultation records without explicit human approval.

## Root Cause Follow-Up

- Record whether the failure was configuration, provider availability, authentication, database/session lookup, or authorization related.
- Add provider-specific monitoring only after the production LiveKit operational setup is verified.