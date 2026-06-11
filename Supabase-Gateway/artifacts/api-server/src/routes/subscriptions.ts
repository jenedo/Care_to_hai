import { Router } from "express";
import { and, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  doctorPlanParticipationTable,
  doctorsTable,
  patientSubscriptionsTable,
  subscriptionPlansTable,
} from "../lib/db";
import { writeAudit } from "../lib/audit";
import { NotFoundError, ValidationError } from "../lib/errors";
import { createPaginatedResult, parsePagination } from "../lib/pagination";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const SUBSCRIPTION_STATUSES = ["ACTIVE", "CANCELLED", "EXPIRED", "TRIAL"] as const;
const PLAN_TIERS = ["BASIC", "STANDARD", "PREMIUM"] as const;
const PLAN_SERVICE_TYPES = ["VIDEO", "AUDIO", "CHAT"] as const;

type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
type PlanTier = (typeof PLAN_TIERS)[number];
type PlanServiceType = (typeof PLAN_SERVICE_TYPES)[number];

const MAX_FILTER_LENGTH = 100;
const MAX_PLAN_NAME_LENGTH = 80;
const MAX_BILLING_CYCLE_LENGTH = 30;
const MAX_DAILY_CONSULTS = 200;

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN", "ADMIN", "FINANCE", "SUPPORT"));

function toMoney(value: unknown): number {
  const amount = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(amount) ? amount : 0;
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

function readBodyObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be an object");
  }

  return body as Record<string, unknown>;
}

function parseStringField(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} is too long`, { maxLength });
  }

  return trimmed;
}

function parseOptionalStringField(value: unknown, fieldName: string, maxLength: number): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} is too long`, { maxLength });
  }

  return trimmed;
}

function parseBooleanField(value: unknown, fieldName: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  throw new ValidationError(`${fieldName} must be a boolean`);
}

function parseOptionalBooleanField(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return parseBooleanField(value, fieldName);
}

function parsePositiveMoney(value: unknown, fieldName: string): string {
  const amount = Number.parseFloat(String(value ?? ""));

  if (!Number.isFinite(amount) || amount < 0) {
    throw new ValidationError(`${fieldName} must be a valid non-negative amount`);
  }

  return amount.toFixed(2);
}

function parseOptionalPositiveMoney(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return parsePositiveMoney(value, fieldName);
}

function parsePositiveInteger(value: unknown, fieldName: string, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value);

  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new ValidationError(`${fieldName} must be a positive integer`, { max });
  }

  return n;
}

function parseOptionalPositiveInteger(value: unknown, fieldName: string, max = Number.MAX_SAFE_INTEGER): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return parsePositiveInteger(value, fieldName, max);
}

function parseFeatures(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("features must be an object");
  }

  return value as Record<string, unknown>;
}

function parseOptionalFeatures(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return parseFeatures(value);
}

function parseSubscriptionStatusFilter(value: unknown): SubscriptionStatus | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  const status = raw.toUpperCase();

  if ((SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
    return status as SubscriptionStatus;
  }

  throw new ValidationError("Invalid subscription status filter", {
    allowed: ["all", ...SUBSCRIPTION_STATUSES],
  });
}

function parsePlanTier(value: unknown): PlanTier {
  if (typeof value !== "string") {
    throw new ValidationError("planTier is required");
  }

  const tier = value.trim().toUpperCase();

  if ((PLAN_TIERS as readonly string[]).includes(tier)) {
    return tier as PlanTier;
  }

  throw new ValidationError("Invalid planTier", { allowed: PLAN_TIERS });
}

function parseOptionalPlanTier(value: unknown): PlanTier | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  return parsePlanTier(raw);
}

function parsePlanServiceType(value: unknown): PlanServiceType {
  if (typeof value !== "string") {
    throw new ValidationError("serviceType is required");
  }

  const serviceType = value.trim().toUpperCase();

  if ((PLAN_SERVICE_TYPES as readonly string[]).includes(serviceType)) {
    return serviceType as PlanServiceType;
  }

  throw new ValidationError("Invalid serviceType", { allowed: PLAN_SERVICE_TYPES });
}

function parseOptionalPlanServiceType(value: unknown): PlanServiceType | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  return parsePlanServiceType(raw);
}

function buildSubscriptionsWhere(query: Record<string, unknown>): SQL | undefined {
  const conditions: SQL[] = [];

  const status = parseSubscriptionStatusFilter(query.status);
  const search = readQueryValue(query.search);

  if (status) {
    conditions.push(eq(patientSubscriptionsTable.status, status));
  }

  if (search) {
    const searchCondition = or(
      ilike(patientSubscriptionsTable.patientName, `%${search}%`),
      ilike(patientSubscriptionsTable.planName, `%${search}%`),
      ilike(patientSubscriptionsTable.patientId, `%${search}%`),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}

function buildDoctorPoolWhere(query: Record<string, unknown>): SQL | undefined {
  const conditions: SQL[] = [];

  const planTier = parseOptionalPlanTier(query.planTier ?? query.plan_tier);
  const serviceType = parseOptionalPlanServiceType(query.serviceType ?? query.service_type);
  const doctorId = readQueryValue(query.doctorId ?? query.doctor_id);
  const isActiveRaw = readQueryValue(query.isActive ?? query.is_active);

  if (planTier) {
    conditions.push(eq(doctorPlanParticipationTable.planTier, planTier));
  }

  if (serviceType) {
    conditions.push(eq(doctorPlanParticipationTable.serviceType, serviceType));
  }

  if (doctorId) {
    conditions.push(eq(doctorPlanParticipationTable.doctorId, doctorId));
  }

  if (isActiveRaw && isActiveRaw.toLowerCase() !== "all") {
    conditions.push(eq(doctorPlanParticipationTable.isActive, parseBooleanField(isActiveRaw, "isActive")));
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function findPlanById(planId: string) {
  const rows = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.id, planId))
    .limit(1);

  return rows[0];
}

async function findDoctorPoolEntryById(entryId: string) {
  const rows = await db
    .select()
    .from(doctorPlanParticipationTable)
    .where(eq(doctorPlanParticipationTable.id, entryId))
    .limit(1);

  return rows[0];
}

async function assertDoctorExists(doctorId: string): Promise<void> {
  const rows = await db
    .select({ id: doctorsTable.id })
    .from(doctorsTable)
    .where(eq(doctorsTable.id, doctorId))
    .limit(1);

  if (!rows.length) {
    throw new NotFoundError("Doctor");
  }
}

router.get("/subscriptions/plans", async (req, res): Promise<void> => {
  const includeInactive = readQueryValue(req.query.include_inactive) === "true";

  const plans = includeInactive
    ? await db.select().from(subscriptionPlansTable).orderBy(desc(subscriptionPlansTable.createdAt))
    : await db
        .select()
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.isActive, true))
        .orderBy(desc(subscriptionPlansTable.createdAt));

  const subscriberCounts = await db
    .select({
      planId: patientSubscriptionsTable.planId,
      activeSubscribers: count(),
    })
    .from(patientSubscriptionsTable)
    .where(eq(patientSubscriptionsTable.status, "ACTIVE"))
    .groupBy(patientSubscriptionsTable.planId);

  const countsByPlanId = new Map(
    subscriberCounts
      .filter((row) => row.planId)
      .map((row) => [row.planId as string, Number(row.activeSubscribers ?? 0)]),
  );

  res.json(
    plans.map((plan) => ({
      ...plan,
      active_subscribers: countsByPlanId.get(plan.id) ?? 0,
    })),
  );
});

router.post(
  "/subscriptions/plans",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res): Promise<void> => {
    const body = readBodyObject(req.body);

    const name = parseStringField(body.name, "name", MAX_PLAN_NAME_LENGTH);
    const price = parsePositiveMoney(body.price, "price");
    const billingCycle = parseOptionalStringField(
      body.billingCycle ?? body.billing_cycle,
      "billingCycle",
      MAX_BILLING_CYCLE_LENGTH,
    ) ?? "monthly";
    const features = parseFeatures(body.features);
    const isActive = parseOptionalBooleanField(body.isActive ?? body.is_active, "isActive") ?? true;

    const rows = await db
      .insert(subscriptionPlansTable)
      .values({
        name,
        price,
        billingCycle,
        features,
        isActive,
      })
      .returning();

    const plan = rows[0];

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "SUBSCRIPTION_PLAN_CREATED",
      entityType: "SubscriptionPlan",
      entityId: plan.id,
      newValue: plan,
    });

    res.status(201).json(plan);
  },
);

router.patch(
  "/subscriptions/plans/:id",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res): Promise<void> => {
    const planId = readRouteParam(req.params.id, "Plan id");
    const body = readBodyObject(req.body);
    const existing = await findPlanById(planId);

    if (!existing) {
      throw new NotFoundError("Subscription plan");
    }

    const update: Partial<typeof subscriptionPlansTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    const name = parseOptionalStringField(body.name, "name", MAX_PLAN_NAME_LENGTH);
    const price = parseOptionalPositiveMoney(body.price, "price");
    const billingCycle = parseOptionalStringField(
      body.billingCycle ?? body.billing_cycle,
      "billingCycle",
      MAX_BILLING_CYCLE_LENGTH,
    );
    const features = parseOptionalFeatures(body.features);
    const isActive = parseOptionalBooleanField(body.isActive ?? body.is_active, "isActive");

    if (name !== undefined) update.name = name;
    if (price !== undefined) update.price = price;
    if (billingCycle !== undefined) update.billingCycle = billingCycle;
    if (features !== undefined) update.features = features;
    if (isActive !== undefined) update.isActive = isActive;

    await db
      .update(subscriptionPlansTable)
      .set(update)
      .where(eq(subscriptionPlansTable.id, planId));

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "SUBSCRIPTION_PLAN_UPDATED",
      entityType: "SubscriptionPlan",
      entityId: planId,
      oldValue: existing,
      newValue: update,
    });

    const updated = await findPlanById(planId);

    if (!updated) {
      throw new NotFoundError("Subscription plan");
    }

    res.json(updated);
  },
);

router.get("/subscriptions/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [mrrRow] = await db
    .select({
      mrr: sql<string>`COALESCE(SUM(${patientSubscriptionsTable.amount}), 0)`,
    })
    .from(patientSubscriptionsTable)
    .where(eq(patientSubscriptionsTable.status, "ACTIVE"));

  const [activeRow] = await db
    .select({ n: count() })
    .from(patientSubscriptionsTable)
    .where(eq(patientSubscriptionsTable.status, "ACTIVE"));

  const [renewalsRow] = await db
    .select({ n: count() })
    .from(patientSubscriptionsTable)
    .where(
      and(
        eq(patientSubscriptionsTable.status, "ACTIVE"),
        gte(patientSubscriptionsTable.endDate, startOfMonth),
        lt(patientSubscriptionsTable.endDate, endOfMonth),
      ),
    );

  const [cancelledThisMonthRow] = await db
    .select({ n: count() })
    .from(patientSubscriptionsTable)
    .where(
      and(
        eq(patientSubscriptionsTable.status, "CANCELLED"),
        gte(patientSubscriptionsTable.updatedAt, startOfMonth),
        lt(patientSubscriptionsTable.updatedAt, endOfMonth),
      ),
    );

  const totalActive = Number(activeRow?.n ?? 0);
  const cancelledThisMonth = Number(cancelledThisMonthRow?.n ?? 0);
  const churnDenominator = totalActive + cancelledThisMonth;
  const churnRate = churnDenominator > 0 ? Number(((cancelledThisMonth / churnDenominator) * 100).toFixed(2)) : 0;

  const planDistribution = await db
    .select({
      plan: patientSubscriptionsTable.planName,
      n: count(),
    })
    .from(patientSubscriptionsTable)
    .where(eq(patientSubscriptionsTable.status, "ACTIVE"))
    .groupBy(patientSubscriptionsTable.planName);

  const plan_distribution = planDistribution.map((row) => {
    const n = Number(row.n ?? 0);

    return {
      plan: row.plan,
      count: n,
      percentage: totalActive > 0 ? ((n / totalActive) * 100).toFixed(1) : "0",
    };
  });

  res.json({
    mrr: toMoney(mrrRow?.mrr),
    active_subscribers: totalActive,
    churn_rate: churnRate,
    renewals_this_month: Number(renewalsRow?.n ?? 0),
    plan_distribution,
  });
});

router.get("/subscriptions/doctor-pool", async (req, res): Promise<void> => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where = buildDoctorPoolWhere(req.query as Record<string, unknown>);

  const totalRows = where
    ? await db.select({ n: count() }).from(doctorPlanParticipationTable).where(where)
    : await db.select({ n: count() }).from(doctorPlanParticipationTable);

  const rows = where
    ? await db
        .select()
        .from(doctorPlanParticipationTable)
        .where(where)
        .orderBy(desc(doctorPlanParticipationTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)
    : await db
        .select()
        .from(doctorPlanParticipationTable)
        .orderBy(desc(doctorPlanParticipationTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

  const total = Number(totalRows[0]?.n ?? 0);

  res.json(
    createPaginatedResult(
      rows.map((row) => ({
        ...row,
        payoutAmount: toMoney(row.payoutAmount),
      })),
      total,
      pagination,
    ),
  );
});

router.post(
  "/subscriptions/doctor-pool",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res): Promise<void> => {
    const body = readBodyObject(req.body);

    const doctorId = parseStringField(body.doctorId ?? body.doctor_id, "doctorId", MAX_FILTER_LENGTH);
    const planTier = parsePlanTier(body.planTier ?? body.plan_tier);
    const serviceType = parsePlanServiceType(body.serviceType ?? body.service_type);
    const payoutAmount = parsePositiveMoney(body.payoutAmount ?? body.payout_amount, "payoutAmount");
    const maxDailyPlanConsults =
      parseOptionalPositiveInteger(
        body.maxDailyPlanConsults ?? body.max_daily_plan_consults,
        "maxDailyPlanConsults",
        MAX_DAILY_CONSULTS,
      ) ?? 10;
    const isActive = parseOptionalBooleanField(body.isActive ?? body.is_active, "isActive") ?? true;

    await assertDoctorExists(doctorId);

    const duplicate = await db
      .select({ id: doctorPlanParticipationTable.id })
      .from(doctorPlanParticipationTable)
      .where(
        and(
          eq(doctorPlanParticipationTable.doctorId, doctorId),
          eq(doctorPlanParticipationTable.planTier, planTier),
          eq(doctorPlanParticipationTable.serviceType, serviceType),
        ),
      )
      .limit(1);

    if (duplicate.length) {
      throw new ValidationError("Doctor is already configured for this plan tier and service type", {
        existingId: duplicate[0].id,
      });
    }

    const rows = await db
      .insert(doctorPlanParticipationTable)
      .values({
        doctorId,
        planTier,
        serviceType,
        payoutAmount,
        maxDailyPlanConsults,
        isActive,
      })
      .returning();

    const entry = rows[0];

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "DOCTOR_PLAN_POOL_CREATED",
      entityType: "DoctorPlanParticipation",
      entityId: entry.id,
      newValue: entry,
    });

    res.status(201).json({
      ...entry,
      payoutAmount: toMoney(entry.payoutAmount),
    });
  },
);

router.patch(
  "/subscriptions/doctor-pool/:id",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res): Promise<void> => {
    const entryId = readRouteParam(req.params.id, "Doctor plan pool entry id");
    const body = readBodyObject(req.body);
    const existing = await findDoctorPoolEntryById(entryId);

    if (!existing) {
      throw new NotFoundError("Doctor plan pool entry");
    }

    const payoutAmount = parseOptionalPositiveMoney(body.payoutAmount ?? body.payout_amount, "payoutAmount");
    const maxDailyPlanConsults = parseOptionalPositiveInteger(
      body.maxDailyPlanConsults ?? body.max_daily_plan_consults,
      "maxDailyPlanConsults",
      MAX_DAILY_CONSULTS,
    );
    const isActive = parseOptionalBooleanField(body.isActive ?? body.is_active, "isActive");

    const update: Partial<typeof doctorPlanParticipationTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payoutAmount !== undefined) update.payoutAmount = payoutAmount;
    if (maxDailyPlanConsults !== undefined) update.maxDailyPlanConsults = maxDailyPlanConsults;
    if (isActive !== undefined) update.isActive = isActive;

    await db
      .update(doctorPlanParticipationTable)
      .set(update)
      .where(eq(doctorPlanParticipationTable.id, entryId));

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "DOCTOR_PLAN_POOL_UPDATED",
      entityType: "DoctorPlanParticipation",
      entityId: entryId,
      oldValue: existing,
      newValue: update,
    });

    const updated = await findDoctorPoolEntryById(entryId);

    if (!updated) {
      throw new NotFoundError("Doctor plan pool entry");
    }

    res.json({
      ...updated,
      payoutAmount: toMoney(updated.payoutAmount),
    });
  },
);

router.get("/subscriptions", async (req, res): Promise<void> => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where = buildSubscriptionsWhere(req.query as Record<string, unknown>);

  const totalRows = where
    ? await db.select({ n: count() }).from(patientSubscriptionsTable).where(where)
    : await db.select({ n: count() }).from(patientSubscriptionsTable);

  const rows = where
    ? await db
        .select({
          id: patientSubscriptionsTable.id,
          patientId: patientSubscriptionsTable.patientId,
          patient_name: patientSubscriptionsTable.patientName,
          plan: patientSubscriptionsTable.planName,
          amount: patientSubscriptionsTable.amount,
          status: patientSubscriptionsTable.status,
          start_date: patientSubscriptionsTable.startDate,
          end_date: patientSubscriptionsTable.endDate,
          created_at: patientSubscriptionsTable.createdAt,
        })
        .from(patientSubscriptionsTable)
        .where(where)
        .orderBy(desc(patientSubscriptionsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)
    : await db
        .select({
          id: patientSubscriptionsTable.id,
          patientId: patientSubscriptionsTable.patientId,
          patient_name: patientSubscriptionsTable.patientName,
          plan: patientSubscriptionsTable.planName,
          amount: patientSubscriptionsTable.amount,
          status: patientSubscriptionsTable.status,
          start_date: patientSubscriptionsTable.startDate,
          end_date: patientSubscriptionsTable.endDate,
          created_at: patientSubscriptionsTable.createdAt,
        })
        .from(patientSubscriptionsTable)
        .orderBy(desc(patientSubscriptionsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

  const now = new Date();

  const data = rows.map((row) => ({
    id: row.id,
    patientId: row.patientId,
    patient_name: row.patient_name,
    plan: row.plan,
    amount: toMoney(row.amount),
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    days_until_renewal:
      row.status === "ACTIVE" && row.end_date
        ? Math.max(0, Math.ceil((new Date(row.end_date).getTime() - now.getTime()) / 86_400_000))
        : null,
  }));

  const total = Number(totalRows[0]?.n ?? 0);

  res.json(createPaginatedResult(data, total, pagination));
});

export default router;
