---
name: SahatGhar API patterns
description: Express API conventions, pagination utility, error handling, and route registration.
---

## Error handling
- `lib/errors.ts` — AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError; ok()/fail() helpers.
- `middlewares/errorHandler.ts` — errorHandler (4-arg) and notFoundHandler registered in `app.ts` AFTER all routes.

## Pagination
- `lib/pagination.ts` — `parsePagination(query)` and `paginate(items, params)`.
- All list endpoints should use these utilities for consistent `{data, total, page, limit, totalPages}` response shape.

## Routes
All routes registered in `routes/index.ts`. Current routes: health, dashboard, doctors, patients, appointments, payments, refunds, payouts, reviews, clinics, subscriptions, support, audit, adminUsers, notifications.

## Mock data
API server uses in-memory arrays (no DB reads yet). DB is provisioned and schema pushed via Drizzle — DB integration is a future phase.

**Why:** Mock data lets the frontend be built and tested before full DB integration. Migration to real DB is the next phase after all pages are built.
