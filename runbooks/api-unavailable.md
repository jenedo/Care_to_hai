# Incident: AsaanCare API unavailable

## Purpose

Recover from an outage of the Express API in `platform/artifacts/api-server` without changing production state blindly.

## Impact

Admin, doctor, and patient clients depend on the API. A full API outage can block authentication-backed actions, appointments, consultations, uploads, and administrative workflows.

## Symptoms

- `GET /api/healthz` is unreachable or returns a non-2xx response.
- Clients report network failures or repeated 5xx responses.
- `asaancare-api` Pino logs show startup or request errors.
- The root route cannot redirect to `/api/healthz`.

## Severity

P1. Escalate to P0 if the outage is accompanied by confirmed data loss, unauthorized access, or a security incident.

## Immediate Actions

**SAFE AUTOMATION**

- Request `<API_BASE_URL>/api/healthz` using the environment's normal HTTP client.
- Check recent `asaancare-api` logs for startup exceptions and 5xx errors.
- Confirm whether the failure affects the API only or also PostgreSQL and external dependencies.

**REQUIRES HUMAN APPROVAL**

- Restarting or redeploying production.
- Changing environment variables, DNS, infrastructure, or credentials.

## Diagnosis

1. Check `/api/healthz`. The implemented health route returns `{ "status": "ok" }` and does not test PostgreSQL or external services.
2. If health is green but features fail, use the dependency-specific runbook instead of treating the API as down.
3. Review Pino logs from service `asaancare-api`; production log level defaults to `info` unless `LOG_LEVEL` is set.
4. Check for startup errors caused by missing `DATABASE_URL`; the DB package throws during initialization when it is absent.
5. From a safe development/CI checkout, verify the current source still builds with `npm run build` and type-checks with `npm run typecheck`. Do not use these commands as a substitute for production diagnosis.

## Recovery

- If the process is unhealthy because a required dependency is unavailable, recover that dependency first.
- If the deployed artifact is known bad, use the hosting platform's verified rollback mechanism only after human approval.
- If the process itself is stopped, use the hosting platform's normal restart procedure only after human approval.

No production hosting control plane or restart command is verified in the repository.

## Validation

- `/api/healthz` returns HTTP 200 with status `ok`.
- A representative authenticated API request succeeds for the affected client type.
- Recent `asaancare-api` logs no longer show the incident error pattern.
- If the incident involved PostgreSQL, Appwrite, Clerk, or LiveKit, complete that runbook's validation as well.

## Rollback

No verified rollback mechanism found.

## Escalation

Stop automated recovery and escalate when:

- health remains unavailable after the hosting process is confirmed running;
- startup fails on missing/invalid production configuration;
- there is evidence of data corruption, unauthorized access, or secret exposure;
- recovery would require a deploy, restart, credential change, or infrastructure change.

## Do Not

- Do not run `npm run seed` or `npm run db:push` as an outage recovery step.
- Do not change production environment variables without approval.
- Do not bypass authentication or rate limiting to make health checks pass.
- Do not deploy untested source changes during incident response.

## Root Cause Follow-Up

- Record the failing endpoint, first error timestamp, and dependency involved.
- Add dependency-aware readiness monitoring if outages can occur while `/api/healthz` remains green.
- Update this runbook only when a production hosting/restart/rollback mechanism is verified in repository configuration.