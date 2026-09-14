# Incident: Secret or credential exposed in repository

## Purpose

Contain and recover from accidental exposure of production-capable credentials in tracked repository content without reproducing the secret or making uncontrolled production changes.

A potential secret exposure is currently detectable in `platform/artifacts/api-server/.env.example`. Do not copy its value into tickets, chat, logs, or this runbook.

## Impact

An exposed database or service credential can permit unauthorized access, data disclosure, data modification, or service disruption depending on the credential's privileges.

## Symptoms

- A tracked file contains a populated credential where a placeholder is expected.
- Secret-scanning or code review flags a database connection string, API key, token, private key, or webhook secret.
- Authentication/database logs show unexpected access consistent with the exposed credential.

## Severity

P0 when a real credential is exposed or compromise cannot be ruled out.

## Immediate Actions

**SAFE AUTOMATION**

- Preserve the file path, commit/branch reference, discovery time, and credential type without recording the credential value.
- Identify which system the credential belongs to and whether it is still active using the authorized provider/control plane.
- Review available access/audit logs for suspicious use beginning before the earliest known exposure.
- Restrict incident discussion to secret-safe metadata: file path, commit, service, timestamps, and status.

**REQUIRES HUMAN APPROVAL**

- Revoking or rotating the exposed credential.
- Updating production secret stores or deployment configuration.
- Rewriting Git history, force-pushing, deleting branches/tags, or invalidating active sessions.
- Database restore, permission changes, or account suspension.

## Diagnosis

1. Confirm that the finding is a real credential rather than an example placeholder without printing or copying it.
2. Determine the affected service and scope of access from the authorized provider interface.
3. Identify the earliest repository commit containing the secret and every reachable branch/tag that contains it.
4. Determine whether the credential remains active.
5. Review provider/database audit evidence for unexpected source addresses, users, queries, or access patterns where such logs are available.
6. If unauthorized access or data modification is suspected, preserve evidence and expand the incident to the relevant security/data-loss procedure before making destructive changes.

## Recovery

1. With explicit human approval, revoke/rotate the exposed credential in the authoritative provider first.
2. Update the production secret store through the normal approved deployment process; do not place the replacement secret in Git.
3. Verify the application works with the replacement credential.
4. Replace the tracked secret with a non-secret placeholder in a separate approved code/documentation change.
5. Decide whether repository history rewriting is required based on organizational policy and repository distribution. History rewrite/force push requires explicit human approval and coordination because it disrupts collaborators and does not revoke already copied credentials.
6. Continue audit-log review until the exposure window is understood.

## Validation

- The old credential is confirmed invalid through the provider's authorized mechanism.
- Production uses the replacement credential and affected functionality works normally.
- The current repository version contains no real value at the exposed path.
- Secret scanning no longer reports the active credential in current content.
- Any suspicious access identified during the exposure window has been investigated.

## Rollback

Credential revocation should not be rolled back to the exposed credential. If the replacement credential causes an outage, issue another authorized credential rather than re-enabling the exposed one.

No verified repository rollback mechanism found for deployment/configuration changes.

## Escalation

Escalate immediately to the security owner and relevant service/data owner when:

- a production-capable credential is confirmed exposed;
- the exposure duration or access scope is unknown;
- audit evidence suggests unauthorized access;
- the credential can modify or delete sensitive data;
- coordinated history rewriting or broad session invalidation is being considered.

## Do Not

- Do not paste the credential into incident tickets, chat, commits, screenshots, or runbooks.
- Do not merely delete the file and assume the credential is safe; Git history and existing clones may retain it.
- Do not force-push rewritten history without explicit approval and coordination.
- Do not rotate unrelated credentials unless evidence requires it.
- Do not restore or delete production data without a verified recovery plan and human approval.

## Root Cause Follow-Up

- Add or enforce repository secret scanning and pre-commit/pre-push protections.
- Ensure `.env.example` files contain placeholders only.
- Review least privilege and credential lifetime for the affected service.
- Document who owns credential rotation and where authoritative audit logs are accessed.