import { Router } from "express";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, reviewsTable } from "../lib/db";
import { writeAudit } from "../lib/audit";
import { NotFoundError, ValidationError } from "../lib/errors";
import { createPaginatedResult, parsePagination } from "../lib/pagination";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const REVIEW_STATUSES = ["PENDING", "PUBLISHED", "HIDDEN", "REPORTED"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const MAX_FILTER_LENGTH = 100;
const MAX_MODERATION_NOTE_LENGTH = 1000;

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"));

function readQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return readQueryValue(value[0]);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > MAX_FILTER_LENGTH) {
    throw new ValidationError("Filter value is too long", {
      maxLength: MAX_FILTER_LENGTH,
    });
  }

  return trimmed;
}

function readRouteParam(value: unknown, fieldName: string): string {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return raw.trim();
}

function parseReviewStatusFilter(value: unknown): ReviewStatus | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  const status = raw.toUpperCase();

  if ((REVIEW_STATUSES as readonly string[]).includes(status)) {
    return status as ReviewStatus;
  }

  throw new ValidationError("Invalid review status filter", {
    allowed: ["all", ...REVIEW_STATUSES],
  });
}

function parseRequiredReviewStatus(value: unknown): ReviewStatus {
  if (typeof value !== "string") {
    throw new ValidationError("status is required");
  }

  const status = value.trim().toUpperCase();

  if ((REVIEW_STATUSES as readonly string[]).includes(status)) {
    return status as ReviewStatus;
  }

  throw new ValidationError("Invalid review status", {
    allowed: REVIEW_STATUSES,
  });
}

function parseModerationNote(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError("moderation note must be a string");
  }

  const note = value.trim();

  if (!note) {
    return undefined;
  }

  if (note.length > MAX_MODERATION_NOTE_LENGTH) {
    throw new ValidationError("moderation note is too long", {
      maxLength: MAX_MODERATION_NOTE_LENGTH,
    });
  }

  return note;
}

function buildReviewsWhere(query: Record<string, unknown>): SQL | undefined {
  const conditions: SQL[] = [];

  const status = parseReviewStatusFilter(query.status);
  const doctorId = readQueryValue(query.doctorId ?? query.doctor_id);
  const search = readQueryValue(query.search);

  if (status) {
    conditions.push(eq(reviewsTable.status, status));
  }

  if (doctorId) {
    conditions.push(eq(reviewsTable.doctorId, doctorId));
  }

  if (search) {
    const searchCondition = or(
      ilike(reviewsTable.patientName, `%${search}%`),
      ilike(reviewsTable.doctorName, `%${search}%`),
      ilike(reviewsTable.comment, `%${search}%`),
      ilike(reviewsTable.reportReason, `%${search}%`),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function findReviewById(reviewId: string) {
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.id, reviewId))
    .limit(1);

  return rows[0];
}

router.get("/reviews", async (req, res): Promise<void> => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where = buildReviewsWhere(req.query as Record<string, unknown>);

  const totalRows = where
    ? await db.select({ n: count() }).from(reviewsTable).where(where)
    : await db.select({ n: count() }).from(reviewsTable);

  const rows = where
    ? await db
        .select()
        .from(reviewsTable)
        .where(where)
        .orderBy(desc(reviewsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)
    : await db
        .select()
        .from(reviewsTable)
        .orderBy(desc(reviewsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

  const total = Number(totalRows[0]?.n ?? 0);

  res.json(createPaginatedResult(rows, total, pagination));
});

router.get("/reviews/stats", async (_req, res): Promise<void> => {
  const grouped = await db
    .select({
      status: reviewsTable.status,
      n: count(),
    })
    .from(reviewsTable)
    .groupBy(reviewsTable.status);

  const averageRows = await db
    .select({
      avgRating: sql<string>`COALESCE(ROUND(AVG(${reviewsTable.rating})::numeric, 1), 0)::text`,
    })
    .from(reviewsTable);

  const stats = {
    total: 0,
    pending: 0,
    published: 0,
    reported: 0,
    hidden: 0,
    avg_rating: averageRows[0]?.avgRating ?? "0.0",
  };

  for (const row of grouped) {
    const n = Number(row.n ?? 0);
    stats.total += n;

    if (row.status === "PENDING") stats.pending = n;
    if (row.status === "PUBLISHED") stats.published = n;
    if (row.status === "REPORTED") stats.reported = n;
    if (row.status === "HIDDEN") stats.hidden = n;
  }

  res.json(stats);
});

router.get("/reviews/:id", async (req, res): Promise<void> => {
  const reviewId = readRouteParam(req.params.id, "Review id");
  const review = await findReviewById(reviewId);

  if (!review) {
    throw new NotFoundError("Review");
  }

  res.json(review);
});

router.patch("/reviews/:id", async (req, res): Promise<void> => {
  const reviewId = readRouteParam(req.params.id, "Review id");
  const nextStatus = parseRequiredReviewStatus(req.body?.status);
  const moderationNote = parseModerationNote(
    req.body?.moderationNote ?? req.body?.moderation_note ?? req.body?.reportReason ?? req.body?.report_reason,
  );

  const existing = await findReviewById(reviewId);

  if (!existing) {
    throw new NotFoundError("Review");
  }

  if (nextStatus === "HIDDEN" && !moderationNote && !existing.reportReason) {
    throw new ValidationError("moderation note is required when hiding a review");
  }

  const update: Partial<typeof reviewsTable.$inferInsert> = {
    status: nextStatus,
    moderatedByAdminId: req.admin!.adminId,
    moderatedAt: new Date(),
    updatedAt: new Date(),
  };

  if (moderationNote) {
    update.reportReason = moderationNote;
  }

  await db
    .update(reviewsTable)
    .set(update)
    .where(eq(reviewsTable.id, reviewId));

  await writeAudit({
    req,
    actorId: req.admin!.userId,
    actorName: req.admin!.fullName,
    actorRole: req.admin!.role,
    action: "REVIEW_MODERATED",
    entityType: "Review",
    entityId: reviewId,
    oldValue: {
      status: existing.status,
      reportReason: existing.reportReason,
      moderatedByAdminId: existing.moderatedByAdminId,
      moderatedAt: existing.moderatedAt,
    },
    newValue: {
      status: nextStatus,
      reportReason: update.reportReason ?? existing.reportReason,
      moderatedByAdminId: update.moderatedByAdminId,
      moderatedAt: update.moderatedAt,
    },
  });

  const updated = await findReviewById(reviewId);

  if (!updated) {
    throw new NotFoundError("Review");
  }

  res.json(updated);
});

export default router;
