import { Router, type Request } from "express";
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  db,
  doctorPlanParticipationTable,
  patientSubscriptionsTable,
  patientsTable,
  subscriptionMembersTable,
  subscriptionPlansTable,
  subscriptionUsageTable,
} from "../lib/db";
import { NotFoundError, ValidationError } from "../lib/errors";
import { requirePatientAuth } from "../middlewares/auth";

const router = Router();

const SERVICE_TYPES = ["VIDEO", "AUDIO", "CHAT"] as const;
const MEMBER_RELATIONSHIPS = [
  "FATHER",
  "MOTHER",
  "WIFE",
  "HUSBAND",
  "CHILD",
  "SISTER",
  "BROTHER",
  "OTHER",
] as const;

type ServiceType = (typeof SERVICE_TYPES)[number];
type MemberRelationship = (typeof MEMBER_RELATIONSHIPS)[number];

type PatientAuthPayload = {
  userId: string;
  email?: string;
  fullName?: string;
  role?: string;
};

type PlanFeatures = {
  familyMemberLimit: number;
  videoCredits: number;
  audioCredits: number;
  chatCredits: number;
  chatSessionSeconds: number;
  allowedDoctorTiers: string[];
  topUpAllowed: boolean;
};

const DEFAULT_FEATURES: PlanFeatures = {
  familyMemberLimit: 1,
  videoCredits: 0,
  audioCredits: 0,
  chatCredits: 0,
  chatSessionSeconds: 120,
  allowedDoctorTiers: ["BASIC"],
  topUpAllowed: false,
};

const ACTIVE_USAGE_STATUSES = ["RESERVED", "STARTED", "COMPLETED"] as const;

router.use(requirePatientAuth);

function getPatientAuth(req: Request): PatientAuthPayload {
  const patient = (req as Request & { patient?: PatientAuthPayload }).patient;

  if (!patient?.userId) {
    throw new ValidationError("Patient authentication context is missing");
  }

  return patient;
}

function readBodyObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be an object");
  }

  return body as Record<string, unknown>;
}

function readRouteParam(value: unknown, fieldName: string): string {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return raw.trim();
}

function parseString(value: unknown, fieldName: string, maxLength = 100): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} is too long`, { maxLength });
  }

  return trimmed;
}

function parseOptionalString(value: unknown, fieldName: string, maxLength = 100): string | undefined {
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

function parseServiceType(value: unknown): ServiceType {
  const serviceType = parseString(value, "serviceType").toUpperCase();

  if ((SERVICE_TYPES as readonly string[]).includes(serviceType)) {
    return serviceType as ServiceType;
  }

  throw new ValidationError("Invalid serviceType", { allowed: SERVICE_TYPES });
}

function parseRelationship(value: unknown): MemberRelationship {
  const relationship = parseString(value, "relationship").toUpperCase();

  if ((MEMBER_RELATIONSHIPS as readonly string[]).includes(relationship)) {
    return relationship as MemberRelationship;
  }

  throw new ValidationError("Invalid relationship", { allowed: MEMBER_RELATIONSHIPS });
}

function parseDurationSeconds(value: unknown, maxSeconds: number): number {
  if (value === undefined || value === null || value === "") {
    return maxSeconds;
  }

  const n = Number(value);

  if (!Number.isInteger(n) || n < 0) {
    throw new ValidationError("durationSeconds must be a non-negative integer");
  }

  return Math.min(n, maxSeconds);
}

function toMoney(value: unknown): number {
  const amount = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeFeatures(value: unknown): PlanFeatures {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  const allowedDoctorTiersRaw = Array.isArray(input.allowedDoctorTiers)
    ? input.allowedDoctorTiers
    : DEFAULT_FEATURES.allowedDoctorTiers;

  return {
    familyMemberLimit: Number(input.familyMemberLimit ?? DEFAULT_FEATURES.familyMemberLimit),
    videoCredits: Number(input.videoCredits ?? DEFAULT_FEATURES.videoCredits),
    audioCredits: Number(input.audioCredits ?? DEFAULT_FEATURES.audioCredits),
    chatCredits: Number(input.chatCredits ?? DEFAULT_FEATURES.chatCredits),
    chatSessionSeconds: Number(input.chatSessionSeconds ?? DEFAULT_FEATURES.chatSessionSeconds),
    allowedDoctorTiers: allowedDoctorTiersRaw.map(String).map((tier) => tier.toUpperCase()),
    topUpAllowed: Boolean(input.topUpAllowed ?? DEFAULT_FEATURES.topUpAllowed),
  };
}

function getCreditLimit(features: PlanFeatures, serviceType: ServiceType): number {
  if (serviceType === "VIDEO") return features.videoCredits;
  if (serviceType === "AUDIO") return features.audioCredits;
  return features.chatCredits;
}

async function getCurrentPatientId(req: Request): Promise<string> {
  const auth = getPatientAuth(req);

  const rows = await db
    .select({ id: patientsTable.id })
    .from(patientsTable)
    .where(eq(patientsTable.userId, auth.userId))
    .limit(1);

  const patientId = rows[0]?.id;

  if (!patientId) {
    throw new NotFoundError("Patient profile");
  }

  return patientId;
}

async function findActiveSubscriptionForPatient(patientId: string) {
  const now = new Date();

  const ownerRows = await db
    .select({
      subscription: patientSubscriptionsTable,
      plan: subscriptionPlansTable,
    })
    .from(patientSubscriptionsTable)
    .innerJoin(subscriptionPlansTable, eq(patientSubscriptionsTable.planId, subscriptionPlansTable.id))
    .where(
      and(
        eq(patientSubscriptionsTable.patientId, patientId),
        eq(patientSubscriptionsTable.status, "ACTIVE"),
        lte(patientSubscriptionsTable.startDate, now),
        gte(patientSubscriptionsTable.endDate, now),
      ),
    )
    .orderBy(desc(patientSubscriptionsTable.createdAt))
    .limit(1);

  if (ownerRows[0]) {
    return {
      ...ownerRows[0],
      isOwner: true,
      ownerPatientId: patientId,
      memberPatientId: patientId,
    };
  }

  const memberRows = await db
    .select({
      member: subscriptionMembersTable,
      subscription: patientSubscriptionsTable,
      plan: subscriptionPlansTable,
    })
    .from(subscriptionMembersTable)
    .innerJoin(
      patientSubscriptionsTable,
      eq(subscriptionMembersTable.subscriptionId, patientSubscriptionsTable.id),
    )
    .innerJoin(subscriptionPlansTable, eq(patientSubscriptionsTable.planId, subscriptionPlansTable.id))
    .where(
      and(
        eq(subscriptionMembersTable.memberPatientId, patientId),
        eq(subscriptionMembersTable.status, "ACTIVE"),
        eq(patientSubscriptionsTable.status, "ACTIVE"),
        lte(patientSubscriptionsTable.startDate, now),
        gte(patientSubscriptionsTable.endDate, now),
      ),
    )
    .orderBy(desc(subscriptionMembersTable.createdAt))
    .limit(1);

  const memberRow = memberRows[0];

  if (!memberRow) {
    throw new NotFoundError("Active subscription");
  }

  return {
    subscription: memberRow.subscription,
    plan: memberRow.plan,
    isOwner: false,
    ownerPatientId: memberRow.member.ownerPatientId,
    memberPatientId: patientId,
  };
}

async function getUsedCredits(subscriptionId: string, serviceType: ServiceType): Promise<number> {
  const rows = await db
    .select({
      used: sql<string>`COALESCE(SUM(${subscriptionUsageTable.creditsUsed}), 0)`,
    })
    .from(subscriptionUsageTable)
    .where(
      and(
        eq(subscriptionUsageTable.subscriptionId, subscriptionId),
        eq(subscriptionUsageTable.serviceType, serviceType),
        inArray(subscriptionUsageTable.status, [...ACTIVE_USAGE_STATUSES]),
      ),
    );

  return Number(rows[0]?.used ?? 0);
}

async function getDoctorPlanEntry(doctorId: string, serviceType: ServiceType, allowedDoctorTiers: string[]) {
  const rows = await db
    .select()
    .from(doctorPlanParticipationTable)
    .where(
      and(
        eq(doctorPlanParticipationTable.doctorId, doctorId),
        eq(doctorPlanParticipationTable.serviceType, serviceType),
        eq(doctorPlanParticipationTable.isActive, true),
      ),
    );

  const entry = rows.find((row) => allowedDoctorTiers.includes(row.planTier));

  if (!entry) {
    throw new ValidationError("Doctor is not available in this subscription plan for selected service");
  }

  return entry;
}

async function assertDoctorDailyLimitAvailable(
  doctorId: string,
  serviceType: ServiceType,
  maxDailyPlanConsults: number,
): Promise<void> {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  const rows = await db
    .select({ n: count() })
    .from(subscriptionUsageTable)
    .where(
      and(
        eq(subscriptionUsageTable.doctorId, doctorId),
        eq(subscriptionUsageTable.serviceType, serviceType),
        inArray(subscriptionUsageTable.status, [...ACTIVE_USAGE_STATUSES]),
        gte(subscriptionUsageTable.createdAt, startOfDay),
        lte(subscriptionUsageTable.createdAt, endOfDay),
      ),
    );

  const usedToday = Number(rows[0]?.n ?? 0);

  if (usedToday >= maxDailyPlanConsults) {
    throw new ValidationError("Doctor daily plan consultation limit reached");
  }
}

async function assertUsageBelongsToCurrentPatient(usageId: string, patientId: string) {
  const activeSubscription = await findActiveSubscriptionForPatient(patientId);

  const rows = await db
    .select()
    .from(subscriptionUsageTable)
    .where(
      and(
        eq(subscriptionUsageTable.id, usageId),
        eq(subscriptionUsageTable.subscriptionId, activeSubscription.subscription.id),
        eq(subscriptionUsageTable.memberPatientId, patientId),
      ),
    )
    .limit(1);

  const usage = rows[0];

  if (!usage) {
    throw new NotFoundError("Subscription usage");
  }

  return usage;
}

router.get("/subscriptions/my/usage", async (req, res): Promise<void> => {
  const patientId = await getCurrentPatientId(req);
  const activeSubscription = await findActiveSubscriptionForPatient(patientId);
  const features = normalizeFeatures(activeSubscription.plan.features);

  const [videoUsed, audioUsed, chatUsed] = await Promise.all([
    getUsedCredits(activeSubscription.subscription.id, "VIDEO"),
    getUsedCredits(activeSubscription.subscription.id, "AUDIO"),
    getUsedCredits(activeSubscription.subscription.id, "CHAT"),
  ]);

  res.json({
    subscription: activeSubscription.subscription,
    plan: activeSubscription.plan,
    is_owner: activeSubscription.isOwner,
    features,
    usage: {
      video: {
        total: features.videoCredits,
        used: videoUsed,
        remaining: Math.max(0, features.videoCredits - videoUsed),
      },
      audio: {
        total: features.audioCredits,
        used: audioUsed,
        remaining: Math.max(0, features.audioCredits - audioUsed),
      },
      chat: {
        total: features.chatCredits,
        used: chatUsed,
        remaining: Math.max(0, features.chatCredits - chatUsed),
        session_seconds: features.chatSessionSeconds,
      },
    },
  });
});

router.get("/subscriptions/my/members", async (req, res): Promise<void> => {
  const patientId = await getCurrentPatientId(req);
  const activeSubscription = await findActiveSubscriptionForPatient(patientId);

  if (!activeSubscription.isOwner) {
    throw new ValidationError("Only subscription owner can view family member management");
  }

  const members = await db
    .select()
    .from(subscriptionMembersTable)
    .where(eq(subscriptionMembersTable.subscriptionId, activeSubscription.subscription.id))
    .orderBy(desc(subscriptionMembersTable.createdAt));

  res.json({
    owner_patient_id: patientId,
    subscription_id: activeSubscription.subscription.id,
    data: members,
  });
});

router.post("/subscriptions/my/members", async (req, res): Promise<void> => {
  const patientId = await getCurrentPatientId(req);
  const activeSubscription = await findActiveSubscriptionForPatient(patientId);

  if (!activeSubscription.isOwner) {
    throw new ValidationError("Only subscription owner can add family members");
  }

  const body = readBodyObject(req.body);
  const relationship = parseRelationship(body.relationship);
  const memberPatientId = parseOptionalString(body.memberPatientId ?? body.member_patient_id, "memberPatientId");
  const invitedPhone = parseOptionalString(body.invitedPhone ?? body.invited_phone, "invitedPhone", 30);

  if (!memberPatientId && !invitedPhone) {
    throw new ValidationError("memberPatientId or invitedPhone is required");
  }

  if (memberPatientId && memberPatientId === patientId) {
    throw new ValidationError("Owner is already included in this subscription");
  }

  const features = normalizeFeatures(activeSubscription.plan.features);

  const existingMembers = await db
    .select({ n: count() })
    .from(subscriptionMembersTable)
    .where(
      and(
        eq(subscriptionMembersTable.subscriptionId, activeSubscription.subscription.id),
        inArray(subscriptionMembersTable.status, ["INVITED", "ACTIVE"]),
      ),
    );

  const totalIncludingOwner = Number(existingMembers[0]?.n ?? 0) + 1;

  if (totalIncludingOwner >= features.familyMemberLimit) {
    throw new ValidationError("Family member limit reached", {
      familyMemberLimit: features.familyMemberLimit,
    });
  }

  if (memberPatientId) {
    const duplicate = await db
      .select({ id: subscriptionMembersTable.id })
      .from(subscriptionMembersTable)
      .where(
        and(
          eq(subscriptionMembersTable.subscriptionId, activeSubscription.subscription.id),
          eq(subscriptionMembersTable.memberPatientId, memberPatientId),
        ),
      )
      .limit(1);

    if (duplicate.length) {
      throw new ValidationError("Member already exists in this subscription");
    }
  }

  const rows = await db
    .insert(subscriptionMembersTable)
    .values({
      subscriptionId: activeSubscription.subscription.id,
      ownerPatientId: patientId,
      memberPatientId: memberPatientId ?? null,
      relationship,
      status: memberPatientId ? "ACTIVE" : "INVITED",
      invitedPhone: invitedPhone ?? null,
      joinedAt: memberPatientId ? new Date() : null,
    })
    .returning();

  res.status(201).json(rows[0]);
});

router.post("/subscriptions/my/members/:id/accept", async (req, res): Promise<void> => {
  const patientId = await getCurrentPatientId(req);
  const memberId = readRouteParam(req.params.id, "Member invite id");

  const inviteRows = await db
    .select()
    .from(subscriptionMembersTable)
    .where(
      and(
        eq(subscriptionMembersTable.id, memberId),
        eq(subscriptionMembersTable.status, "INVITED"),
      ),
    )
    .limit(1);

  const invite = inviteRows[0];

  if (!invite) {
    throw new NotFoundError("Subscription member invite");
  }

  await db
    .update(subscriptionMembersTable)
    .set({
      memberPatientId: patientId,
      status: "ACTIVE",
      joinedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionMembersTable.id, memberId));

  const updated = await db
    .select()
    .from(subscriptionMembersTable)
    .where(eq(subscriptionMembersTable.id, memberId))
    .limit(1);

  res.json(updated[0]);
});

router.post("/subscriptions/usage/reserve", async (req, res): Promise<void> => {
  const patientId = await getCurrentPatientId(req);
  const body = readBodyObject(req.body);

  const doctorId = parseString(body.doctorId ?? body.doctor_id, "doctorId");
  const serviceType = parseServiceType(body.serviceType ?? body.service_type);

  const activeSubscription = await findActiveSubscriptionForPatient(patientId);
  const features = normalizeFeatures(activeSubscription.plan.features);
  const creditLimit = getCreditLimit(features, serviceType);

  if (creditLimit <= 0) {
    throw new ValidationError(`${serviceType} is not included in this plan`);
  }

  const usedCredits = await getUsedCredits(activeSubscription.subscription.id, serviceType);

  if (usedCredits >= creditLimit) {
    throw new ValidationError(`${serviceType} credits finished for this billing period`, {
      total: creditLimit,
      used: usedCredits,
      remaining: 0,
    });
  }

  const doctorPlanEntry = await getDoctorPlanEntry(doctorId, serviceType, features.allowedDoctorTiers);

  await assertDoctorDailyLimitAvailable(
    doctorId,
    serviceType,
    doctorPlanEntry.maxDailyPlanConsults,
  );

  const rows = await db
    .insert(subscriptionUsageTable)
    .values({
      subscriptionId: activeSubscription.subscription.id,
      memberPatientId: patientId,
      doctorId,
      serviceType,
      status: "RESERVED",
      creditsUsed: 1,
      durationSeconds: 0,
      payoutAmount: doctorPlanEntry.payoutAmount,
    })
    .returning();

  res.status(201).json({
    usage: {
      ...rows[0],
      payoutAmount: toMoney(rows[0].payoutAmount),
    },
    remaining_after_reserve: Math.max(0, creditLimit - usedCredits - 1),
  });
});

router.post("/subscriptions/usage/:id/start", async (req, res): Promise<void> => {
  const patientId = await getCurrentPatientId(req);
  const usageId = readRouteParam(req.params.id, "Usage id");
  const usage = await assertUsageBelongsToCurrentPatient(usageId, patientId);

  if (usage.status !== "RESERVED") {
    throw new ValidationError("Only RESERVED usage can be started");
  }

  await db
    .update(subscriptionUsageTable)
    .set({
      status: "STARTED",
      startedAt: usage.startedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionUsageTable.id, usageId));

  const updated = await db
    .select()
    .from(subscriptionUsageTable)
    .where(eq(subscriptionUsageTable.id, usageId))
    .limit(1);

  res.json(updated[0]);
});

router.post("/subscriptions/usage/:id/complete", async (req, res): Promise<void> => {
  const patientId = await getCurrentPatientId(req);
  const usageId = readRouteParam(req.params.id, "Usage id");
  const body = readBodyObject(req.body);
  const usage = await assertUsageBelongsToCurrentPatient(usageId, patientId);

  if (usage.status !== "RESERVED" && usage.status !== "STARTED") {
    throw new ValidationError("Only RESERVED or STARTED usage can be completed");
  }

  const activeSubscription = await findActiveSubscriptionForPatient(patientId);
  const features = normalizeFeatures(activeSubscription.plan.features);

  const maxDuration = usage.serviceType === "CHAT"
    ? features.chatSessionSeconds
    : 86_400;

  const durationSeconds = parseDurationSeconds(
    body.durationSeconds ?? body.duration_seconds,
    maxDuration,
  );

  await db
    .update(subscriptionUsageTable)
    .set({
      status: "COMPLETED",
      durationSeconds,
      startedAt: usage.startedAt ?? new Date(),
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionUsageTable.id, usageId));

  const updated = await db
    .select()
    .from(subscriptionUsageTable)
    .where(eq(subscriptionUsageTable.id, usageId))
    .limit(1);

  res.json(updated[0]);
});

router.post("/subscriptions/usage/:id/cancel", async (req, res): Promise<void> => {
  const patientId = await getCurrentPatientId(req);
  const usageId = readRouteParam(req.params.id, "Usage id");
  const usage = await assertUsageBelongsToCurrentPatient(usageId, patientId);

  if (usage.status === "COMPLETED") {
    throw new ValidationError("Completed usage cannot be cancelled");
  }

  await db
    .update(subscriptionUsageTable)
    .set({
      status: "CANCELLED",
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionUsageTable.id, usageId));

  res.json({ success: true });
});

export default router;
