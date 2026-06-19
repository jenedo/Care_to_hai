import { Router } from "express";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, refundsTable } from "../lib/db";
import { writeAudit } from "../lib/audit";
import { NotFoundError, ValidationError } from "../lib/errors";
import { createPaginatedResult, parsePagination } from "../lib/pagination";
import { FINANCE_AND_ABOVE, requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const REFUND_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "PROCESSED"] as const;
type RefundStatus = (typeof REFUND_STATUSES)[number];

const MAX_FILTER_LENGTH = 100;
const MAX_NOTES_LENGTH = 1000;

const ALLOWED_REFUND_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  REQUESTED: ["REQUESTED", "APPROVED", "REJECTED"],
  APPROVED: ["APPROVED", "PROCESSED", "REJECTED"],
  REJECTED: ["REJECTED"],
  PROCESSED: ["PROCESSED"],
};

router.use(requireAuth);
router.use(requireRole(...FINANCE_AND_ABOVE));

function toMoney(value: unknown): number {
  const amount = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(amount) ? amount : 0;
}

function mapRefund(r: typeof refundsTable.$inferSelect) {
  return {
    id: r.id,
    patient_name: r.requestedByName ?? "Unknown",
    doctor_name: null,
    amount: r.amount != null ? toMoney(r.amount) : 0,
    reason: r.reason ?? "",
    status: r.status,
    requested_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    payment_id: r.paymentId ?? null,
    appointment_id: r.appointmentId ?? null,
    admin_notes: r.adminNotes ?? null,
    requested_by: r.requestedBy ?? null,
  };
}

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

function parseRefundStatusFilter(value: unknown): RefundStatus | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  const status = raw.toUpperCase();

  if ((REFUND_STATUSES as readonly string[]).includes(status)) {
    return status as RefundStatus;
  }

  throw new ValidationError("Invalid refund status filter", {
    allowed: ["all", ...REFUND_STATUSES],
  });
}

function parseRequiredRefundStatus(value: unknown): RefundStatus {
  if (typeof value !== "string") {
    throw new ValidationError("status is required");
  }

  const status = value.trim().toUpperCase();

  if ((REFUND_STATUSES as readonly string[]).includes(status)) {
    return status as RefundStatus;
  }

  throw new ValidationError("Invalid refund status", {
    allowed: REFUND_STATUSES,
  });
}

function parseNotes(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError("adminNotes must be a string");
  }

  const notes = value.trim();

  if (!notes) {
    return undefined;
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    throw new ValidationError("adminNotes is too long", {
      maxLength: MAX_NOTES_LENGTH,
    });
  }

  return notes;
}

function assertValidRefundTransition(currentStatus: RefundStatus, nextStatus: RefundStatus): void {
  const allowed = ALLOWED_REFUND_TRANSITIONS[currentStatus];

  if (!allowed.includes(nextStatus)) {
    throw new ValidationError("Invalid refund status transition", {
      from: currentStatus,
      to: nextStatus,
      allowed,
    });
  }
}

function buildRefundsWhere(query: Record<string, unknown>): SQL | undefined {
  const conditions: SQL[] = [];

  const status = parseRefundStatusFilter(query.status);
  const search = readQueryValue(query.search);

  if (status) {
    conditions.push(eq(refundsTable.status, status));
  }

  if (search) {
    const searchCondition = or(
      ilike(refundsTable.requestedByName, `%${search}%`),
      ilike(refundsTable.reason, `%${search}%`),
      ilike(refundsTable.paymentId, `%${search}%`),
      ilike(refundsTable.appointmentId, `%${search}%`),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function findRefundById(refundId: string) {
  const rows = await db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.id, refundId))
    .limit(1);

  return rows[0];
}

router.get("/refunds", async (req, res): Promise<void> => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where = buildRefundsWhere(req.query as Record<string, unknown>);

  const totalRows = where
    ? await db.select({ n: count() }).from(refundsTable).where(where)
    : await db.select({ n: count() }).from(refundsTable);

  const rows = where
    ? await db
        .select()
        .from(refundsTable)
        .where(where)
        .orderBy(desc(refundsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)
    : await db
        .select()
        .from(refundsTable)
        .orderBy(desc(refundsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

  const total = Number(totalRows[0]?.n ?? 0);

  res.json(
    createPaginatedResult(
      rows.map(mapRefund),
      total,
      pagination,
    ),
  );
});

router.get("/refunds/stats", async (_req, res): Promise<void> => {
  const grouped = await db
    .select({
      status: refundsTable.status,
      n: count(),
      amount: sql<string>`COALESCE(SUM(${refundsTable.amount}), 0)`,
    })
    .from(refundsTable)
    .groupBy(refundsTable.status);

  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    processed: 0,
    rejected: 0,
    requested_amount: 0,
    approved_amount: 0,
    processed_amount: 0,
    rejected_amount: 0,
  };

  for (const row of grouped) {
    const n = Number(row.n ?? 0);
    const amount = toMoney(row.amount);

    stats.total += n;

    if (row.status === "REQUESTED") {
      stats.pending = n;
      stats.requested_amount = amount;
    }

    if (row.status === "APPROVED") {
      stats.approved = n;
      stats.approved_amount = amount;
    }

    if (row.status === "PROCESSED") {
      stats.processed = n;
      stats.processed_amount = amount;
    }

    if (row.status === "REJECTED") {
      stats.rejected = n;
      stats.rejected_amount = amount;
    }
  }

  res.json(stats);
});

router.get("/refunds/:id", async (req, res): Promise<void> => {
  const refundId = readRouteParam(req.params.id, "Refund id");
  const refund = await findRefundById(refundId);

  if (!refund) {
    throw new NotFoundError("Refund");
  }

  res.json(mapRefund(refund));
});

router.patch("/refunds/:id", async (req, res): Promise<void> => {
  const refundId = readRouteParam(req.params.id, "Refund id");
  const nextStatus = parseRequiredRefundStatus(req.body?.status);
  const notes = parseNotes(req.body?.adminNotes ?? req.body?.admin_notes);

  const existing = await findRefundById(refundId);

  if (!existing) {
    throw new NotFoundError("Refund");
  }

  assertValidRefundTransition(existing.status as RefundStatus, nextStatus);

  if (nextStatus === "REJECTED" && !notes && !existing.adminNotes) {
    throw new ValidationError("adminNotes is required when rejecting a refund");
  }

  const update: Partial<typeof refundsTable.$inferInsert> = {
    status: nextStatus,
    adminNotes: notes ?? existing.adminNotes,
    reviewedByAdminId: req.admin!.adminId,
    updatedAt: new Date(),
  };

  await db
    .update(refundsTable)
    .set(update)
    .where(eq(refundsTable.id, refundId));

  await writeAudit({
    req,
    actorId: req.admin!.userId,
    actorName: req.admin!.fullName,
    actorRole: req.admin!.role,
    action: "REFUND_STATUS_CHANGED",
    entityType: "Refund",
    entityId: refundId,
    oldValue: {
      status: existing.status,
      adminNotes: existing.adminNotes,
      reviewedByAdminId: existing.reviewedByAdminId,
    },
    newValue: {
      status: nextStatus,
      adminNotes: update.adminNotes,
      reviewedByAdminId: update.reviewedByAdminId,
    },
  });

  const updated = await findRefundById(refundId);

  if (!updated) {
    throw new NotFoundError("Refund");
  }

  res.json(mapRefund(updated));
});

export default router;
