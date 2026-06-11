import { Router } from "express";
import { eq, and, desc, ilike, count, type SQL } from "drizzle-orm";
import { clinicsTable, db } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();

router.use(requireAuth);

const CLINIC_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

type ClinicStatus = (typeof CLINIC_STATUSES)[number];
type ClinicUpdateData = Partial<typeof clinicsTable.$inferInsert>;

function getQueryString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getRouteParam(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeUpper(value: unknown): string | undefined {
  return getQueryString(value)?.toUpperCase();
}

function isClinicStatus(value: unknown): value is ClinicStatus {
  return typeof value === "string" && (CLINIC_STATUSES as readonly string[]).includes(value);
}

function getPaginationQuery(query: Record<string, unknown>): Record<string, string> {
  const paginationQuery: Record<string, string> = {};

  const page = getQueryString(query.page);
  const limit = getQueryString(query.limit);

  if (page) {
    paginationQuery.page = page;
  }

  if (limit) {
    paginationQuery.limit = limit;
  }

  return paginationQuery;
}

function getOptionalBodyString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

router.get("/clinics", async (req, res): Promise<void> => {
  const conditions: SQL<unknown>[] = [];

  const status = normalizeUpper(req.query.status);
  const city = getQueryString(req.query.city);
  const search = getQueryString(req.query.search);

  if (status && status !== "ALL") {
    if (!isClinicStatus(status)) {
      res.status(400).json({ error: "Invalid clinic status" });
      return;
    }

    conditions.push(eq(clinicsTable.status, status));
  }

  if (city) {
    conditions.push(ilike(clinicsTable.city, `%${city}%`));
  }

  if (search) {
    conditions.push(ilike(clinicsTable.name, `%${search}%`));
  }

  const { page, limit } = parsePagination(getPaginationQuery(req.query as Record<string, unknown>));
  const offset = (page - 1) * limit;
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    whereClause
      ? db
          .select()
          .from(clinicsTable)
          .where(whereClause)
          .orderBy(desc(clinicsTable.createdAt))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(clinicsTable)
          .orderBy(desc(clinicsTable.createdAt))
          .limit(limit)
          .offset(offset),

    whereClause
      ? db.select({ n: count() }).from(clinicsTable).where(whereClause)
      : db.select({ n: count() }).from(clinicsTable),
  ]);

  const total = Number(totalRows[0]?.n ?? 0);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  res.json({
    data: rows,
    total,
    page,
    limit,
    totalPages,
  });
});

router.get("/clinics/:id", async (req, res): Promise<void> => {
  const id = getRouteParam(req.params.id);

  if (!id) {
    res.status(400).json({ error: "Clinic id is required" });
    return;
  }

  const clinic = await db.select().from(clinicsTable).where(eq(clinicsTable.id, id)).limit(1);

  if (!clinic.length) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }

  res.json(clinic[0]);
});

router.post("/clinics", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res): Promise<void> => {
  const name = getOptionalBodyString(req.body?.name);
  const phone = getOptionalBodyString(req.body?.phone);
  const address = getOptionalBodyString(req.body?.address);
  const city = getOptionalBodyString(req.body?.city);
  const area = getOptionalBodyString(req.body?.area);

  if (!name) {
    res.status(400).json({ error: "Clinic name is required" });
    return;
  }

  const [newClinic] = await db
    .insert(clinicsTable)
    .values({
      name,
      phone,
      address,
      city,
      area,
      status: "ACTIVE",
    })
    .returning();

  await writeAudit({
    req,
    actorId: req.admin!.userId,
    actorName: req.admin!.fullName,
    actorRole: req.admin!.role,
    action: "CLINIC_CREATED",
    entityType: "Clinic",
    entityId: newClinic.id,
    newValue: newClinic,
  });

  res.status(201).json(newClinic);
});

router.patch("/clinics/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res): Promise<void> => {
  const id = getRouteParam(req.params.id);

  if (!id) {
    res.status(400).json({ error: "Clinic id is required" });
    return;
  }

  const existing = await db.select().from(clinicsTable).where(eq(clinicsTable.id, id)).limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }

  const updateData: ClinicUpdateData = {
    updatedAt: new Date(),
  };

  const name = getOptionalBodyString(req.body?.name);
  const phone = getOptionalBodyString(req.body?.phone);
  const address = getOptionalBodyString(req.body?.address);
  const city = getOptionalBodyString(req.body?.city);
  const area = getOptionalBodyString(req.body?.area);
  const status = normalizeUpper(req.body?.status);

  if (name !== undefined) {
    if (!name) {
      res.status(400).json({ error: "Clinic name cannot be empty" });
      return;
    }

    updateData.name = name;
  }

  if (phone !== undefined) {
    updateData.phone = phone;
  }

  if (address !== undefined) {
    updateData.address = address;
  }

  if (city !== undefined) {
    updateData.city = city;
  }

  if (area !== undefined) {
    updateData.area = area;
  }

  if (status !== undefined) {
    if (!isClinicStatus(status)) {
      res.status(400).json({ error: "Invalid clinic status" });
      return;
    }

    updateData.status = status;
  }

  if (Object.keys(updateData).length === 1) {
    res.status(400).json({ error: "No valid clinic fields provided" });
    return;
  }

  const [updated] = await db
    .update(clinicsTable)
    .set(updateData)
    .where(eq(clinicsTable.id, id))
    .returning();

  await writeAudit({
    req,
    actorId: req.admin!.userId,
    actorName: req.admin!.fullName,
    actorRole: req.admin!.role,
    action: "CLINIC_UPDATED",
    entityType: "Clinic",
    entityId: id,
    oldValue: existing[0],
    newValue: updated,
  });

  res.json(updated);
});

router.delete("/clinics/:id", requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const id = getRouteParam(req.params.id);

  if (!id) {
    res.status(400).json({ error: "Clinic id is required" });
    return;
  }

  const existing = await db.select().from(clinicsTable).where(eq(clinicsTable.id, id)).limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }

  await db
    .update(clinicsTable)
    .set({
      status: "INACTIVE",
      updatedAt: new Date(),
    })
    .where(eq(clinicsTable.id, id));

  await writeAudit({
    req,
    actorId: req.admin!.userId,
    actorName: req.admin!.fullName,
    actorRole: req.admin!.role,
    action: "CLINIC_DEACTIVATED",
    entityType: "Clinic",
    entityId: id,
    oldValue: existing[0],
    newValue: {
      status: "INACTIVE",
    },
  });

  res.status(204).send();
});

export default router;