# Incident: PostgreSQL database unavailable

## Purpose

Diagnose and recover database connectivity failures affecting the AsaanCare API. The application uses `pg.Pool` through Drizzle and requires `DATABASE_URL`.

## Impact

Database-backed API operations can fail across admin, doctor, and patient workflows. If `DATABASE_URL` is missing at startup, the database package throws and can prevent the API from starting.

## Symptoms

- API startup error indicating that `DATABASE_URL` is not set.
- Database-backed requests return 5xx responses while `/api/healthz` may still return `ok`.
- `platform/scripts/verify-db.mjs` prints `DB_CONNECT: FAIL` in an approved diagnostic environment.
- API logs contain PostgreSQL/Drizzle connection or query errors.

## Severity

P1. Treat as P0 if there is evidence of data loss, corruption, unauthorized database access, or credential compromise.

## Immediate Actions

**SAFE AUTOMATION**

- Check `/api/healthz` to distinguish API process availability from dependency availability.
- Review `asaancare-api` logs for the first database error and its timestamp.
- In an approved checkout that already has the target environment's `.env` provisioned, run the repository's read-only diagnostic:

```bash
cd platform
node scripts/verify-db.mjs
```

The script performs connectivity and metadata/count `SELECT` queries only.

**REQUIRES HUMAN APPROVAL**

- Changing `DATABASE_URL`.
- Rotating database credentials.
- Provider failover, restore, branch promotion, or other database control-plane actions.
- Any schema or data-changing command.

## Diagnosis

1. Do not rely on `/api/healthz` as a database readiness check; it does not query PostgreSQL.
2. Confirm whether `DATABASE_URL` is present in the running environment without printing its value.
3. Run `platform/scripts/verify-db.mjs` only where its expected `.env` is already safely provisioned. Record `DB_CONNECT: OK` or the error class; do not paste credentials into tickets or chat.
4. If connectivity succeeds, determine whether the incident is query/schema-specific rather than a database outage.
5. If connectivity fails, distinguish network/provider unavailability from authentication failure using the returned error, without exposing the connection string.
6. The repository contains a Neon PR-preview workflow, but that workflow is not a verified production database recovery mechanism.

## Recovery

- For transient provider/network failure, wait for or follow the database provider's approved production recovery process. The active production provider is **NOT VERIFIED** by repository implementation alone.
- For an invalid or revoked credential, rotate/update it only through the authorized secret-management process with human approval.
- For schema mismatch, stop and escalate; do not run schema push or migrations as an incident shortcut.
- For suspected corruption or data loss, preserve evidence and escalate before any restore.

## Validation

- The approved database diagnostic reports `DB_CONNECT: OK`.
- A representative database-backed API request succeeds.
- `/api/healthz` remains healthy.
- New database-related 5xx errors stop appearing in `asaancare-api` logs.

## Rollback

No verified rollback mechanism found.

## Escalation

Escalate immediately when:

- data loss or corruption is suspected;
- database credentials may be exposed;
- recovery requires restore, failover, credential rotation, schema changes, or provider control-plane changes;
- connectivity is healthy but application queries continue to fail.

## Do Not

- Do not run `npm run db:push` or `pnpm --filter @asaancare/db run push` against production during outage diagnosis.
- Do not run seed commands.
- Do not print or copy `DATABASE_URL` into logs, chat, or incident notes.
- Do not restore or delete production data without explicit human approval and a verified recovery plan.

## Root Cause Follow-Up

- Record whether the failure was startup configuration, authentication, network/provider availability, or query/schema related.
- Add a dependency-aware readiness check if operational monitoring currently depends only on `/api/healthz`.
- Document the actual production database provider, backup policy, restore procedure, and rollback mechanism once verified.