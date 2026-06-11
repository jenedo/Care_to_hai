import { Router } from "express";
import { and, count, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { db, doctorPayoutsTable } from "../lib/db";
import { writeAudit } from "../lib/audit";
import { NotFoundError, ValidationError } from "../lib/errors";
import { createPaginatedResult, parsePagination } from "../lib/pagination";
import { FINANCE_AND_ABOVE, requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const PAYOUT_STATUSES = ["PENDING", "APPROVED", "PAID", "REJECTED"] as const;
type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

const MAX_FILTER_LENGTH = 100;
const MAX_NOTES_LENGTH = 1000;

const ALLOWED_STATUS_TRANSITIONS: Record<PayoutStatus, readonly PayoutStatus[]> = {
  PENDING: ["PENDING", "APPROVED", "REJECTED"],
  APPROVED: ["APPROVED", "PAID", "REJECTED"],
  PAID: ["PAID"],
  REJECTED: ["REJECTED"],
};

router.use(requireAuth);
router.use(requireRole(...FINANCE_AND_ABOVE));

function toMoney(value: unknown): number {
  const amount = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(amount) ? amount : 0;
}

function mapPayout(p: typeof doctorPayoutsTable.$inferSelect) {
  return {
    id: p.id,
    doctor_name: p.doctorName ?? "",
    doctor_id: p.doctorId,
    amount: p.amount != null ? toMoney(p.amount) : 0,
    status: p.status,
    bank_name: p.bankName ?? null,
    account_title: p.accountTitle ?? null,
    account_number: p.accountNumber ?? null,
    iban: p.iban ?? null,
    wallet_provider: p.walletProvider ?? null,
    wallet_number: p.walletNumber ?? null,
    requested_at: p.requestedAt.toISOString(),
    processed_at: p.processedAt?.toISOString() ?? null,
    admin_notes: p.adminNotes ?? null,
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

function parsePayoutStatusFilter(value: unknown): PayoutStatus | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  const status = raw.toUpperCase();

  if ((PAYOUT_STATUSES as readonly string[]).includes(status)) {
    return status as PayoutStatus;
  }

  throw new ValidationError("Invalid payout status filter", {
    allowed: ["all", ...PAYOUT_STATUSES],
  });
}

function parseRequiredPayoutStatus(value: unknown): PayoutStatus {
  if (typeof value !== "string") {
    throw new ValidationError("status is required");
  }

  const status = value.trim().toUpperCase();

  if ((PAYOUT_STATUSES as readonly string[]).includes(status)) {
    return status as PayoutStatus;
  }

  throw new ValidationError("Invalid payout status", {
    allowed: PAYOUT_STATUSES,
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

function assertValidTransition(currentStatus: PayoutStatus, nextStatus: PayoutStatus): void {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];

  if (!allowed.includes(nextStatus)) {
    throw new ValidationError("Invalid payout status transition", {
      from: currentStatus,
      to: nextStatus,
      allowed,
    });
  }
}

function buildPayoutsWhere(query: Record<string, unknown>): SQL | undefined {
  const conditions: SQL[] = [];

  const status = parsePayoutStatusFilter(query.status);
  const doctorId = readQueryValue(query.doctor_id);
  const search = readQueryValue(query.search);

  if (status) {
    conditions.push(eq(doctorPayoutsTable.status, status));
  }

  if (doctorId) {
    conditions.push(eq(doctorPayoutsTable.doctorId, doctorId));
  }

  if (search) {
    conditions.push(ilike(doctorPayoutsTable.doctorName, `%${search}%`));
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function findPayoutById(payoutId: string) {
  const rows = await db
    .select()
    .from(doctorPayoutsTable)
    .where(eq(doctorPayoutsTable.id, payoutId))
    .limit(1);

  return rows[0];
}

router.get("/payouts", async (req, res): Promise<void> => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where = buildPayoutsWhere(req.query as Record<string, unknown>);

  const totalRows = where
    ? await db.select({ n: count() }).from(doctorPayoutsTable).where(where)
    : await db.select({ n: count() }).from(doctorPayoutsTable);

  const rows = where
    ? await db
        .select()
        .from(doctorPayoutsTable)
        .where(where)
        .orderBy(desc(doctorPayoutsTable.requestedAt))
        .limit(pagination.limit)
        .offset(pagination.offset)
    : await db
        .select()
        .from(doctorPayoutsTable)
        .orderBy(desc(doctorPayoutsTable.requestedAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

  const total = Number(totalRows[0]?.n ?? 0);

  res.json(
    createPaginatedResult(
      rows.map(mapPayout),
      total,
      pagination,
    ),
  );
});

router.get("/payouts/stats", async (_req, res): Promise<void> => {
  const grouped = await db
    .select({
      status: doctorPayoutsTable.status,
      n: count(),
      amount: sql<string>`COALESCE(SUM(${doctorPayoutsTable.amount}), 0)`,
    })
    .from(doctorPayoutsTable)
    .groupBy(doctorPayoutsTable.status);

  const stats = {
    pending: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    total_pending_amount: 0,
  };

  for (const row of grouped) {
    const n = Number(row.n ?? 0);
    const amount = toMoney(row.amount);

    if (row.status === "PENDING") {
      stats.pending = n;
      stats.total_pending_amount += amount;
    }

    if (row.status === "APPROVED") {
      stats.approved = n;
      stats.total_pending_amount += amount;
    }

    if (row.status === "PAID") {
      stats.paid = n;
    }

    if (row.status === "REJECTED") {
      stats.rejected = n;
    }
  }

  res.json(stats);
});

router.get("/payouts/:id", async (req, res): Promise<void> => {
  const payoutId = readRouteParam(req.params.id, "Payout id");
  const payout = await findPayoutById(payoutId);

  if (!payout) {
    throw new NotFoundError("Payout");
  }

  res.json(mapPayout(payout));
});

router.patch("/payouts/:id", async (req, res): Promise<void> => {
  const payoutId = readRouteParam(req.params.id, "Payout id");
  const nextStatus = parseRequiredPayoutStatus(req.body?.status);
  const notes = parseNotes(req.body?.adminNotes ?? req.body?.admin_notes);

  const existing = await findPayoutById(payoutId);

  if (!existing) {
    throw new NotFoundError("Payout");
  }

  assertValidTransition(existing.status as PayoutStatus, nextStatus);

  if (nextStatus === "REJECTED" && !notes && !existing.adminNotes) {
    throw new ValidationError("adminNotes is required when rejecting a payout");
  }

  const update: Partial<typeof doctorPayoutsTable.$inferInsert> = {
    status: nextStatus,
    adminNotes: notes ?? existing.adminNotes,
    processedByAdminId: req.admin!.adminId,
    updatedAt: new Date(),
  };

  if (nextStatus === "PAID" && !existing.processedAt) {
    update.processedAt = new Date();
  }

  await db
    .update(doctorPayoutsTable)
    .set(update)
    .where(eq(doctorPayoutsTable.id, payoutId));

  await writeAudit({
    req,
    actorId: req.admin!.userId,
    actorName: req.admin!.fullName,
    actorRole: req.admin!.role,
    action: "PAYOUT_STATUS_CHANGED",
    entityType: "DoctorPayout",
    entityId: payoutId,
    oldValue: {
      status: existing.status,
      adminNotes: existing.adminNotes,
      processedAt: existing.processedAt,
    },
    newValue: {
      status: nextStatus,
      adminNotes: update.adminNotes,
      processedAt: update.processedAt ?? existing.processedAt,
    },
  });

  const updated = await findPayoutById(payoutId);

  if (!updated) {
    throw new NotFoundError("Payout");
  }

  res.json(mapPayout(updated));
});

export default router;
