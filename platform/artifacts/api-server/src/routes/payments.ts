import { Router } from "express";
import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db, paymentsTable } from "../lib/db";
import { NotFoundError, ValidationError } from "../lib/errors";
import { createPaginatedResult, parsePagination } from "../lib/pagination";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
const PAYMENT_METHODS = ["CASH", "SAFEPLAY", "JAZZCASH", "EASYPAISA", "CARD", "BANK", "RAAST"] as const;

type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const MAX_FILTER_LENGTH = 100;

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN", "ADMIN", "FINANCE", "SUPPORT"));

function toMoney(value: unknown): number {
  const amount = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(amount) ? amount : 0;
}

function mapPayment(p: typeof paymentsTable.$inferSelect) {
  return {
    id: p.id,
    amount: toMoney(p.amount),
    gateway: p.method,
    status: p.status.toLowerCase(),
    date: p.createdAt.toISOString(),
    patient_name: p.patientName ?? "",
    doctor_name: p.doctorName ?? null,
    appointment_id: p.appointmentId ?? null,
    consultation_fee: null,
    platform_fee: null,
    tax: null,
    refund_status: p.status === "REFUNDED" ? "refunded" : null,
    transaction_ref: p.transactionRef ?? null,
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

function parsePaymentStatus(value: unknown): PaymentStatus | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  const status = raw.toUpperCase();

  if ((PAYMENT_STATUSES as readonly string[]).includes(status)) {
    return status as PaymentStatus;
  }

  throw new ValidationError("Invalid payment status filter", {
    allowed: ["all", ...PAYMENT_STATUSES],
  });
}

function parsePaymentMethod(value: unknown): PaymentMethod | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  const method = raw.toUpperCase();

  if ((PAYMENT_METHODS as readonly string[]).includes(method)) {
    return method as PaymentMethod;
  }

  throw new ValidationError("Invalid payment gateway filter", {
    allowed: ["all", ...PAYMENT_METHODS],
  });
}

function parseDateFilter(value: unknown, fieldName: string, endOfDay = false): Date | undefined {
  const raw = readQueryValue(value);

  if (!raw) {
    return undefined;
  }

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = dateOnly
    ? new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }

  return date;
}

function buildPaymentsWhere(query: Record<string, unknown>): SQL | undefined {
  const conditions: SQL[] = [];

  const status = parsePaymentStatus(query.status);
  const method = parsePaymentMethod(query.gateway);
  const doctorId = readQueryValue(query.doctor_id);
  const search = readQueryValue(query.search);
  const dateFrom = parseDateFilter(query.date_from, "date_from");
  const dateTo = parseDateFilter(query.date_to, "date_to", true);

  if (status) {
    conditions.push(eq(paymentsTable.status, status));
  }

  if (method) {
    conditions.push(eq(paymentsTable.method, method));
  }

  if (doctorId) {
    conditions.push(eq(paymentsTable.doctorId, doctorId));
  }

  if (dateFrom) {
    conditions.push(gte(paymentsTable.createdAt, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(paymentsTable.createdAt, dateTo));
  }

  if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
    throw new ValidationError("date_from cannot be after date_to");
  }

  if (search) {
    const searchCondition = or(
      ilike(paymentsTable.patientName, `%${search}%`),
      ilike(paymentsTable.doctorName, `%${search}%`),
      ilike(paymentsTable.transactionRef, `%${search}%`),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function findPaymentById(paymentId: string) {
  const rows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, paymentId))
    .limit(1);

  return rows[0];
}

router.get("/payments", async (req, res): Promise<void> => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where = buildPaymentsWhere(req.query as Record<string, unknown>);

  const totalRows = where
    ? await db.select({ n: count() }).from(paymentsTable).where(where)
    : await db.select({ n: count() }).from(paymentsTable);

  const rows = where
    ? await db
        .select()
        .from(paymentsTable)
        .where(where)
        .orderBy(desc(paymentsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)
    : await db
        .select()
        .from(paymentsTable)
        .orderBy(desc(paymentsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

  const total = Number(totalRows[0]?.n ?? 0);

  res.json(
    createPaginatedResult(
      rows.map(mapPayment),
      total,
      pagination,
    ),
  );
});

router.get("/payments/stats", async (_req, res): Promise<void> => {
  const grouped = await db
    .select({
      status: paymentsTable.status,
      method: paymentsTable.method,
      n: count(),
      amount: sql<string>`COALESCE(SUM(${paymentsTable.amount}), 0)`,
    })
    .from(paymentsTable)
    .groupBy(paymentsTable.status, paymentsTable.method);

  let totalCollected = 0;
  let matched = 0;
  let unmatched = 0;
  let failedCount = 0;
  const byGateway: Record<string, number> = {};

  for (const row of grouped) {
    const n = Number(row.n ?? 0);
    const amount = toMoney(row.amount);

    if (row.status === "PAID") {
      matched += n;
      totalCollected += amount;
      byGateway[row.method] = (byGateway[row.method] ?? 0) + amount;
    }

    if (row.status === "PENDING") {
      unmatched += n;
    }

    if (row.status === "FAILED") {
      failedCount += n;
    }
  }

  const by_gateway = Object.entries(byGateway).map(([gateway, amount]) => ({
    gateway,
    amount,
    percentage: totalCollected > 0 ? Math.round((amount / totalCollected) * 100) : 0,
  }));

  res.json({
    total_collected: totalCollected,
    matched,
    unmatched,
    failed_count: failedCount,
    by_gateway,
    doctor_pending_payouts: 0,
  });
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const paymentId = readRouteParam(req.params.id, "Payment id");
  const payment = await findPaymentById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment");
  }

  res.json(mapPayment(payment));
});

export default router;
