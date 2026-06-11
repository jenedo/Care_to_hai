import { randomUUID } from "node:crypto";
import { Router } from "express";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, doctorsTable, doctorVerificationsTable } from "../lib/db";
import { requireAuth, requireRole, VERIFIER_AND_ABOVE } from "../middlewares/auth";
import { parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();

router.use(requireAuth);

const VERIFICATION_STATUSES = [
  "INCOMPLETE",
  "PENDING",
  "IN_REVIEW",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
] as const;

const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
type Gender = (typeof GENDERS)[number];
type DoctorUpdateData = Partial<typeof doctorsTable.$inferInsert>;

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

function isVerificationStatus(value: unknown): value is VerificationStatus {
  return typeof value === "string" && (VERIFICATION_STATUSES as readonly string[]).includes(value);
}

function isGender(value: unknown): value is Gender {
  return typeof value === "string" && (GENDERS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFirstProvided(
  body: Record<string, unknown>,
  keys: readonly string[],
): unknown | undefined {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      return body[key];
    }
  }

  return undefined;
}

function getOptionalString(value: unknown): string | null | undefined {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNullableDecimalString(value: unknown): string | null | undefined {
  if (value === null || value === "") {
    return null;
  }

  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }

  return n.toFixed(2);
}

function parseNullableInteger(value: unknown): number | null | undefined {
  if (value === null || value === "") {
    return null;
  }

  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isInteger(n) || n < 0) {
    return undefined;
  }

  return n;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return undefined;
}

function parseQualifications(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPaginationQuery(query: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};

  const page = getQueryString(query.page);
  const limit = getQueryString(query.limit);

  if (page) {
    result.page = page;
  }

  if (limit) {
    result.limit = limit;
  }

  return result;
}

function mapDoctor(d: typeof doctorsTable.$inferSelect) {
  return {
    id: d.id,
    name: d.fullName,
    specialty: d.specialty,
    city: d.city ?? "",
    pmdc_number: d.pmdcNumber ?? "",
    status: d.verificationStatus.toLowerCase(),
    joined_date: d.createdAt.toISOString(),
    avatar_url: d.avatarUrl ?? null,
    rating: d.rating != null ? Number.parseFloat(d.rating) : null,
    appointments_completed: d.appointmentsCompleted ?? 0,
    no_shows: d.noShows ?? 0,
    avg_response_time: null,
    featured: d.isFeatured ?? false,
    fee: d.consultationFee != null ? Number.parseFloat(d.consultationFee) : null,
    email: d.email,
    phone: d.phone ?? null,
    gender: d.gender ?? null,
    qualifications: d.qualifications,
    experience_years: d.experienceYears ?? null,
    bio: d.bio ?? null,
    area: d.area ?? null,
    is_available_online: d.isAvailableOnline,
    total_reviews: d.totalReviews,
    verification_status: d.verificationStatus,
  };
}

router.get("/doctors", async (req, res): Promise<void> => {
  const conditions: SQL<unknown>[] = [];

  const status = normalizeUpper(req.query.status);
  const specialty = getQueryString(req.query.specialty);
  const city = getQueryString(req.query.city);
  const search = getQueryString(req.query.search);

  if (status && status !== "ALL") {
    if (!isVerificationStatus(status)) {
      res.status(400).json({ error: "Invalid doctor verification status" });
      return;
    }

    conditions.push(eq(doctorsTable.verificationStatus, status));
  }

  if (specialty) {
    conditions.push(ilike(doctorsTable.specialty, `%${specialty}%`));
  }

  if (city) {
    conditions.push(ilike(doctorsTable.city, `%${city}%`));
  }

  if (search) {
    const searchCondition = or(
      ilike(doctorsTable.fullName, `%${search}%`),
      ilike(doctorsTable.pmdcNumber, `%${search}%`),
      ilike(doctorsTable.specialty, `%${search}%`),
      ilike(doctorsTable.email, `%${search}%`),
      ilike(doctorsTable.phone, `%${search}%`),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const { page, limit } = parsePagination(getPaginationQuery(req.query as Record<string, unknown>));
  const offset = (page - 1) * limit;
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    whereClause
      ? db
          .select()
          .from(doctorsTable)
          .where(whereClause)
          .orderBy(desc(doctorsTable.createdAt))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(doctorsTable)
          .orderBy(desc(doctorsTable.createdAt))
          .limit(limit)
          .offset(offset),

    whereClause
      ? db.select({ n: count() }).from(doctorsTable).where(whereClause)
      : db.select({ n: count() }).from(doctorsTable),
  ]);

  const total = Number(totalRows[0]?.n ?? 0);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  res.json({
    data: rows.map(mapDoctor),
    total,
    page,
    limit,
    totalPages,
  });
});

router.get("/doctors/stats", async (_req, res): Promise<void> => {
  const [total, verified, pending, inReview, suspended, rejected] = await Promise.all([
    db.select({ n: count() }).from(doctorsTable),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "VERIFIED")),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "PENDING")),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "IN_REVIEW")),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "SUSPENDED")),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "REJECTED")),
  ]);

  res.json({
    total: Number(total[0]?.n ?? 0),
    verified: Number(verified[0]?.n ?? 0),
    pending: Number(pending[0]?.n ?? 0) + Number(inReview[0]?.n ?? 0),
    suspended: Number(suspended[0]?.n ?? 0),
    rejected: Number(rejected[0]?.n ?? 0),
  });
});

router.get("/doctors/:id", async (req, res): Promise<void> => {
  const id = getRouteParam(req.params.id);

  if (!id) {
    res.status(400).json({ error: "Doctor id is required" });
    return;
  }

  const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

  if (!doctor.length) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  res.json(mapDoctor(doctor[0]));
});

router.patch(
  "/doctors/:id",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res): Promise<void> => {
    const id = getRouteParam(req.params.id);

    if (!id) {
      res.status(400).json({ error: "Doctor id is required" });
      return;
    }

    if (!isRecord(req.body)) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const existing = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

    if (!existing.length) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    const updateData: DoctorUpdateData = {
      updatedAt: new Date(),
    };

    const fullNameRaw = getFirstProvided(req.body, ["name", "fullName"]);
    const specialtyRaw = getFirstProvided(req.body, ["specialty"]);
    const cityRaw = getFirstProvided(req.body, ["city"]);
    const areaRaw = getFirstProvided(req.body, ["area"]);
    const phoneRaw = getFirstProvided(req.body, ["phone"]);
    const emailRaw = getFirstProvided(req.body, ["email"]);
    const pmdcRaw = getFirstProvided(req.body, ["pmdc_number", "pmdcNumber"]);
    const bioRaw = getFirstProvided(req.body, ["bio"]);
    const feeRaw = getFirstProvided(req.body, ["fee", "consultationFee"]);
    const experienceRaw = getFirstProvided(req.body, ["experience_years", "experienceYears"]);
    const genderRaw = getFirstProvided(req.body, ["gender"]);
    const qualificationsRaw = getFirstProvided(req.body, ["qualifications"]);
    const isAvailableOnlineRaw = getFirstProvided(req.body, ["is_available_online", "isAvailableOnline"]);
    const isFeaturedRaw = getFirstProvided(req.body, ["featured", "isFeatured"]);

    if (fullNameRaw !== undefined) {
      const fullName = getOptionalString(fullNameRaw);

      if (!fullName) {
        res.status(400).json({ error: "Doctor name cannot be empty" });
        return;
      }

      updateData.fullName = fullName;
    }

    if (specialtyRaw !== undefined) {
      const specialty = getOptionalString(specialtyRaw);

      if (!specialty) {
        res.status(400).json({ error: "Specialty cannot be empty" });
        return;
      }

      updateData.specialty = specialty;
    }

    if (cityRaw !== undefined) {
      updateData.city = getOptionalString(cityRaw);
    }

    if (areaRaw !== undefined) {
      updateData.area = getOptionalString(areaRaw);
    }

    if (phoneRaw !== undefined) {
      updateData.phone = getOptionalString(phoneRaw);
    }

    if (emailRaw !== undefined) {
      const email = getOptionalString(emailRaw);

      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Valid doctor email is required" });
        return;
      }

      updateData.email = email.toLowerCase();
    }

    if (pmdcRaw !== undefined) {
      updateData.pmdcNumber = getOptionalString(pmdcRaw);
    }

    if (bioRaw !== undefined) {
      updateData.bio = getOptionalString(bioRaw);
    }

    if (feeRaw !== undefined) {
      const fee = parseNullableDecimalString(feeRaw);

      if (fee === undefined) {
        res.status(400).json({ error: "Invalid consultation fee" });
        return;
      }

      updateData.consultationFee = fee;
    }

    if (experienceRaw !== undefined) {
      const experienceYears = parseNullableInteger(experienceRaw);

      if (experienceYears === undefined) {
        res.status(400).json({ error: "Invalid experience years" });
        return;
      }

      updateData.experienceYears = experienceYears;
    }

    if (genderRaw !== undefined) {
      const gender = normalizeUpper(genderRaw);

      if (gender === undefined) {
        updateData.gender = null;
      } else if (!isGender(gender)) {
        res.status(400).json({ error: "Invalid gender" });
        return;
      } else {
        updateData.gender = gender;
      }
    }

    if (qualificationsRaw !== undefined) {
      const qualifications = parseQualifications(qualificationsRaw);

      if (!qualifications) {
        res.status(400).json({ error: "Qualifications must be an array of strings" });
        return;
      }

      updateData.qualifications = qualifications;
    }

    if (isAvailableOnlineRaw !== undefined) {
      const isAvailableOnline = parseOptionalBoolean(isAvailableOnlineRaw);

      if (isAvailableOnline === undefined) {
        res.status(400).json({ error: "Invalid online availability value" });
        return;
      }

      updateData.isAvailableOnline = isAvailableOnline;
    }

    if (isFeaturedRaw !== undefined) {
      const isFeatured = parseOptionalBoolean(isFeaturedRaw);

      if (isFeatured === undefined) {
        res.status(400).json({ error: "Invalid featured value" });
        return;
      }

      updateData.isFeatured = isFeatured;
    }

    if (Object.keys(updateData).length === 1) {
      res.status(400).json({ error: "No valid doctor fields provided" });
      return;
    }

    const [updated] = await db
      .update(doctorsTable)
      .set(updateData)
      .where(eq(doctorsTable.id, id))
      .returning();

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "DOCTOR_UPDATED",
      entityType: "Doctor",
      entityId: id,
      oldValue: existing[0],
      newValue: updated,
    });

    res.json(mapDoctor(updated));
  },
);

router.get(
  "/doctors/:id/verification",
  requireRole(...VERIFIER_AND_ABOVE),
  async (req, res): Promise<void> => {
    const id = getRouteParam(req.params.id);

    if (!id) {
      res.status(400).json({ error: "Doctor id is required" });
      return;
    }

    const verification = await db
      .select()
      .from(doctorVerificationsTable)
      .where(eq(doctorVerificationsTable.doctorId, id))
      .orderBy(desc(doctorVerificationsTable.createdAt))
      .limit(1);

    res.json(verification[0] ?? null);
  },
);

router.post(
  "/doctors/:id/verification/approve",
  requireRole(...VERIFIER_AND_ABOVE),
  async (req, res): Promise<void> => {
    const id = getRouteParam(req.params.id);

    if (!id) {
      res.status(400).json({ error: "Doctor id is required" });
      return;
    }

    const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

    if (!doctor.length) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    if (!["PENDING", "IN_REVIEW"].includes(doctor[0].verificationStatus)) {
      res.status(400).json({ error: "Doctor is not in a reviewable state" });
      return;
    }

    await db
      .update(doctorsTable)
      .set({
        verificationStatus: "VERIFIED",
        updatedAt: new Date(),
      })
      .where(eq(doctorsTable.id, id));

    await db
      .update(doctorVerificationsTable)
      .set({
        status: "VERIFIED",
        reviewedAt: new Date(),
        reviewedByAdminId: req.admin!.adminId ?? req.admin!.userId,
        updatedAt: new Date(),
      })
      .where(eq(doctorVerificationsTable.doctorId, id));

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "DOCTOR_APPROVED",
      entityType: "Doctor",
      entityId: id,
      oldValue: {
        status: doctor[0].verificationStatus,
      },
      newValue: {
        status: "VERIFIED",
      },
    });

    const updated = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

    res.json(mapDoctor(updated[0]));
  },
);

router.post(
  "/doctors/:id/verification/reject",
  requireRole(...VERIFIER_AND_ABOVE),
  async (req, res): Promise<void> => {
    const id = getRouteParam(req.params.id);

    if (!id) {
      res.status(400).json({ error: "Doctor id is required" });
      return;
    }

    if (!isRecord(req.body)) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const reason = getOptionalString(req.body.reason);

    if (!reason || reason.length < 3) {
      res.status(400).json({ error: "Rejection reason is required" });
      return;
    }

    const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

    if (!doctor.length) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    if (!["PENDING", "IN_REVIEW"].includes(doctor[0].verificationStatus)) {
      res.status(400).json({ error: "Doctor is not in a reviewable state" });
      return;
    }

    await db
      .update(doctorsTable)
      .set({
        verificationStatus: "REJECTED",
        updatedAt: new Date(),
      })
      .where(eq(doctorsTable.id, id));

    await db
      .update(doctorVerificationsTable)
      .set({
        status: "REJECTED",
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedByAdminId: req.admin!.adminId ?? req.admin!.userId,
        updatedAt: new Date(),
      })
      .where(eq(doctorVerificationsTable.doctorId, id));

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "DOCTOR_REJECTED",
      entityType: "Doctor",
      entityId: id,
      oldValue: {
        status: doctor[0].verificationStatus,
      },
      newValue: {
        status: "REJECTED",
        reason,
      },
    });

    const updated = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

    res.json(mapDoctor(updated[0]));
  },
);

router.patch(
  "/doctors/:id/status",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res): Promise<void> => {
    const id = getRouteParam(req.params.id);

    if (!id) {
      res.status(400).json({ error: "Doctor id is required" });
      return;
    }

    if (!isRecord(req.body)) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const dbStatus = normalizeUpper(req.body.status);

    if (!dbStatus || !isVerificationStatus(dbStatus)) {
      res.status(400).json({ error: "Valid doctor verification status is required" });
      return;
    }

    const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

    if (!doctor.length) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    await db
      .update(doctorsTable)
      .set({
        verificationStatus: dbStatus,
        updatedAt: new Date(),
      })
      .where(eq(doctorsTable.id, id));

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "DOCTOR_STATUS_CHANGED",
      entityType: "Doctor",
      entityId: id,
      oldValue: {
        status: doctor[0].verificationStatus,
      },
      newValue: {
        status: dbStatus,
      },
    });

    const updated = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

    res.json(mapDoctor(updated[0]));
  },
);

router.post(
  "/doctors",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res): Promise<void> => {
    if (!isRecord(req.body)) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const name = getOptionalString(req.body.name ?? req.body.fullName);
    const specialty = getOptionalString(req.body.specialty);
    const city = getOptionalString(req.body.city);
    const area = getOptionalString(req.body.area);
    const phone = getOptionalString(req.body.phone);
    const pmdcNumber = getOptionalString(req.body.pmdc_number ?? req.body.pmdcNumber);
    const bio = getOptionalString(req.body.bio);
    const fee = parseNullableDecimalString(req.body.fee ?? req.body.consultationFee);
    const experienceYears = parseNullableInteger(req.body.experience_years ?? req.body.experienceYears);
    const qualifications = parseQualifications(req.body.qualifications ?? []);
    const genderRaw = normalizeUpper(req.body.gender);
    let genderValue: Gender | null = null;

    if (genderRaw !== undefined) {
      if (!isGender(genderRaw)) {
        res.status(400).json({ error: "Invalid gender" });
        return;
      }

      genderValue = genderRaw;
    }

    const isAvailableOnline = parseOptionalBoolean(req.body.is_available_online ?? req.body.isAvailableOnline);
    const isFeatured = parseOptionalBoolean(req.body.featured ?? req.body.isFeatured);

    if (!name) {
      res.status(400).json({ error: "Doctor name is required" });
      return;
    }

    if (!specialty) {
      res.status(400).json({ error: "Doctor specialty is required" });
      return;
    }

    if (fee === undefined) {
      res.status(400).json({ error: "Invalid consultation fee" });
      return;
    }

    if (experienceYears === undefined) {
      res.status(400).json({ error: "Invalid experience years" });
      return;
    }

    let email = getOptionalString(req.body.email);

    if (email !== undefined && email !== null && !email.includes("@")) {
      res.status(400).json({ error: "Valid doctor email is required" });
      return;
    }

    if (!email) {
      email = `doctor.${randomUUID().slice(0, 8)}@sahatghar.pk`;
    }

    const [inserted] = await db
      .insert(doctorsTable)
      .values({
        fullName: name,
        specialty,
        city,
        area,
        pmdcNumber,
        consultationFee: fee,
        phone,
        email: email.toLowerCase(),
        gender: genderValue,
        qualifications: qualifications ?? [],
        experienceYears,
        bio,
        isAvailableOnline: isAvailableOnline ?? false,
        isFeatured: isFeatured ?? false,
        verificationStatus: "PENDING",
        profileStatus: "INCOMPLETE",
      })
      .returning();

    await writeAudit({
      req,
      actorId: req.admin!.userId,
      actorName: req.admin!.fullName,
      actorRole: req.admin!.role,
      action: "DOCTOR_CREATED",
      entityType: "Doctor",
      entityId: inserted.id,
      newValue: inserted,
    });

    res.status(201).json(mapDoctor(inserted));
  },
);

export default router;

