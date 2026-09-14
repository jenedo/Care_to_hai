# Incident: Appwrite file uploads failing

## Purpose

Recover from failures in the API's Appwrite Storage upload paths for doctor documents and patient avatars.

## Impact

Doctors may be unable to upload documents and patients may be unable to upload avatars. Other API functions can remain healthy.

## Symptoms

- `POST /api/uploads/doctor-document` or `POST /api/uploads/avatar` returns HTTP `500` with `UPLOAD_ERROR`.
- API startup/runtime logs warn: `APPWRITE_API_KEY not set — server-side Appwrite calls will fail`.
- Uploads fail while `/api/healthz` remains `ok`.
- HTTP `400` for unsupported MIME type, missing file, or invalid avatar type is client validation, not an Appwrite outage.

## Severity

P1 when document uploads required for core doctor workflows are broadly unavailable; otherwise P2 for a limited avatar-only failure.

## Immediate Actions

**SAFE AUTOMATION**

- Confirm `/api/healthz` is healthy.
- Review `asaancare-api` logs for Appwrite or `UPLOAD_ERROR` messages.
- Determine whether both upload routes fail or only one route/file type.
- Check presence, without printing values, of `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, and `APPWRITE_BUCKET_ID` in the running deployment configuration.

**REQUIRES HUMAN APPROVAL**

- Changing Appwrite credentials, project/bucket configuration, permissions, or storage infrastructure.
- Deleting or recreating stored files or buckets.

## Diagnosis

1. Reproduce only with a non-sensitive test file that meets the implemented limits: maximum 10 MiB and one of JPEG, PNG, WebP, or PDF for doctor documents; avatars must be images.
2. If the API returns a validation `400`, correct the client input rather than changing storage configuration.
3. If it returns `500 UPLOAD_ERROR`, inspect the server log for the underlying Appwrite error.
4. Verify the environment variable names are present; do not print their values.
5. Confirm the configured bucket referenced by `APPWRITE_BUCKET_ID` exists using the authorized Appwrite operational interface. The code defaults the bucket identifier to `doctor-documents` when the variable is absent.
6. If only authenticated upload routes fail with `401` or `403`, use `authentication-failure.md` instead.

## Recovery

- For Appwrite service unavailability, keep authentication and upload validation in place and follow the provider's approved recovery/status procedure.
- For missing/invalid credentials or bucket/project configuration, correction requires human approval through the authorized secret/configuration process.
- Do not recreate a bucket or alter permissions as an automated recovery step.

## Validation

- `/api/healthz` remains healthy.
- A non-sensitive test upload to the affected route succeeds and returns a file URL.
- Existing previously uploaded files remain accessible through the application's expected path.
- New `UPLOAD_ERROR` responses stop occurring.

## Rollback

No verified rollback mechanism found.

## Escalation

Escalate when:

- stored files appear missing, overwritten, or exposed to unintended users;
- recovery requires credential, bucket, permission, or project changes;
- Appwrite is healthy but valid uploads continue to return `500`;
- the incident may involve sensitive doctor/patient document exposure.

## Do Not

- Do not delete or recreate the production bucket during diagnosis.
- Do not make the bucket public to restore uploads.
- Do not log file contents, credentials, or sensitive document URLs unnecessarily.
- Do not weaken MIME/type or authentication checks as recovery.

## Root Cause Follow-Up

- Record whether the cause was provider availability, credentials, project/bucket configuration, authorization, or invalid client input.
- Add an approved storage dependency check if upload availability is operationally critical.
- Verify Appwrite access controls for sensitive doctor documents after any storage incident.