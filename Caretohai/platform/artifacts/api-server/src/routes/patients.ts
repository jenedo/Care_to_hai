import { Router } from "express";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, patientsTable } from "../lib/db";
import { writeAudit } from "../lib/audit";
import { NotFoundError, ValidationError } from "../lib/errors";
import { createPaginatedResult, parsePagination } from "../lib/pagination";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const PATIENT_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"] as const;
type PatientStatus = (typeof PATIENT_STATUSES)[number];

const MAX_FILTER_LENGTH = 100;

router.use(requireAuth);

function mapPatient(p: typeof patientsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.fullName,
    phone: p.phone ?? "",
    email: p.email ?? null,
    city: p.city ?? "",
    status: p.status.toLowerCase(),
    joined_date: p.createdAt.toISOString(),
    avatar_url: p.avatarUrl ?? null,
    total_bookings: p.totalAppointments ?? 0,
    total_spent: null,
    upcoming_bookings: null,
    gender: p.gender ?? null,
    date_of_birth: p.dateOfBirth ?? null,
    blood_group: p.bloodGroup ?? null,
    area: p.area ?? null,
    address: p.address ?? null,
    emergency_contact: p.emergencyContact ?? null,
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

function parseStatusFilter(value: unknown): PatientStatus | undefined {
  const raw = readQueryValue(value);

  if (!raw || raw.toLowerCase() === "all") {
    return undefined;
  }

  const status = raw.toUpperCase();

  if ((PATIENT_STATUSES as readonly string[]).includes(status)) {
    return status as PatientStatus;
  }

  throw new ValidationError("Invalid patient status filter", {
    allowed: ["all", ...PATIENT_STATUSES],
  });
}

function parseRequiredStatus(value: unknown): PatientStatus {
  if (typeof value !== "string") {
    throw new ValidationError("status is required");
  }

  const status = value.trim().toUpperCase();

  if ((PATIENT_STATUSES as readonly string[]).includes(status)) {
    return status as PatientStatus;
  }

  throw new ValidationError("Invalid patient status", {
    allowed: PATIENT_STATUSES,
  });
}

function parseRequiredBoolean(value: unknown, fieldName: string): boolean {
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

function readRouteParam(value: unknown, fieldName: string): string {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return raw.trim();
}

function buildPatientsWhere(query: Record<string, unknown>): SQL | undefined {
  const conditions: SQL[] = [];

  const status = parseStatusFilter(query.status);
  const city = readQueryValue(query.city);
  const search = readQueryValue(query.search);

  if (status) {
    conditions.push(eq(patientsTable.status, status));
  }

  if (city) {
    conditions.push(ilike(patientsTable.city, `%${city}%`));
  }

  if (search) {
    const searchCondition = or(
      ilike(patientsTable.fullName, `%${search}%`),
      ilike(patientsTable.email, `%${search}%`),
      ilike(patientsTable.phone, `%${search}%`),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function findPatientById(patientId: string) {
  const rows = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, patientId))
    .limit(1);

  return rows[0];
}

router.get("/patients", async (req, res): Promise<void> => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where = buildPatientsWhere(req.query as Record<string, unknown>);

  const totalRows = where
    ? await db.select({ n: count() }).from(patientsTable).where(where)
    : await db.select({ n: count() }).from(patientsTable);

  const rows = where
    ? await db
        .select()
        .from(patientsTable)
        .where(where)
        .orderBy(desc(patientsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)
    : await db
        .select()
        .from(patientsTable)
        .orderBy(desc(patientsTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

  const total = totalRows[0]?.n ?? 0;

  res.json(
    createPaginatedResult(
      rows.map(mapPatient),
      total,
      pagination,
    ),
  );
});

router.get("/patients/stats", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      status: patientsTable.status,
      n: count(),
    })
    .from(patientsTable)
    .groupBy(patientsTable.status);

  const stats = {
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    deleted: 0,
  };

  for (const row of rows) {
    const n = row.n ?? 0;
    stats.total += n;

    if (row.status === "ACTIVE") stats.active = n;
    if (row.status === "INACTIVE") stats.inactive = n;
    if (row.status === "SUSPENDED") stats.suspended = n;
    if (row.status === "DELETED") stats.deleted = n;
  }

  res.json(stats);
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const patientId = readRouteParam(req.params.id, "Patient id");

  if (!patientId) {
    throw new ValidationError("Patient id is required");
  }

  const patient = await findPatientById(patientId);

  if (!patient) {
    throw new NotFoundError("Patient");
  }

  res.json(mapPatient(patient));
});

router.patch(
  "/patients/:id/status",
  requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"),
  async (req, res): Promise<void> => {
    const patientId = readRouteParam(req.params.id, "Patient id");

    if (!patientId) {
      throw new ValidationError("Patient id is required");
    }

    const dbStatus = parseRequiredStatus(req.body?.status);
    const existing = await findPatientById(patientId);

    if (!existing) {
      throw new NotFoundError("Patient");
    }

    await db
      .update(patientsTable)
      .set({ status: dbStatus, updatedAt: new Date() })
      .where(eq(patientsTable.id, patientId));

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "PATIENT_STATUS_CHANGED",
      entityType: "Patient",
      entityId: patientId,
      oldValue: { status: existing.status },
      newValue: { status: dbStatus },
    });

    const updated = await findPatientById(patientId);

    if (!updated) {
      throw new NotFoundError("Patient");
    }

    res.json(mapPatient(updated));
  },
);

router.patch(
  "/patients/:id/block",
  requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"),
  async (req, res): Promise<void> => {
    const patientId = readRouteParam(req.params.id, "Patient id");

    if (!patientId) {
      throw new ValidationError("Patient id is required");
    }

    const blocked = parseRequiredBoolean(req.body?.blocked, "blocked");
    const existing = await findPatientById(patientId);

    if (!existing) {
      throw new NotFoundError("Patient");
    }

    const dbStatus: PatientStatus = blocked ? "SUSPENDED" : "ACTIVE";

    await db
      .update(patientsTable)
      .set({ status: dbStatus, updatedAt: new Date() })
      .where(eq(patientsTable.id, patientId));

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: blocked ? "PATIENT_BLOCKED" : "PATIENT_UNBLOCKED",
      entityType: "Patient",
      entityId: patientId,
      oldValue: { status: existing.status },
      newValue: { status: dbStatus },
    });

    const updated = await findPatientById(patientId);

    if (!updated) {
      throw new NotFoundError("Patient");
    }

    res.json(mapPatient(updated));
  },
);

export default router;

