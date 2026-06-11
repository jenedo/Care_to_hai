import { Router, type Request, type Response } from "express";
import { eq, ilike, and, or, desc, gte, lte, type SQL } from "drizzle-orm";
import { appointmentsTable, db } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();

router.use(requireAuth);

const APPOINTMENT_STATUSES = [
  "HELD",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
] as const;

const CONSULTATION_TYPES = ["ONLINE", "CLINIC", "BOTH"] as const;

type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
type ConsultationType = (typeof CONSULTATION_TYPES)[number];

function getQueryString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeUpper(value: unknown): string | undefined {
  return getQueryString(value)?.toUpperCase();
}

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

function isConsultationType(value: unknown): value is ConsultationType {
  return typeof value === "string" && (CONSULTATION_TYPES as readonly string[]).includes(value);
}

function parseDateFilter(value: unknown): Date | null {
  const raw = getQueryString(value);

  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNullableNumber(value: string | null): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRouteParam(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

function mapAppointment(a: typeof appointmentsTable.$inferSelect) {
  return {
    id: a.id,
    patient_name: a.patientName,
    patient_age: a.patientAge != null ? Number.parseInt(a.patientAge, 10) || null : null,
    patient_gender: a.patientGender ?? null,
    doctor_name: a.doctorName,
    doctor_specialty: a.doctorSpecialty ?? null,
    date_time: a.appointmentDate.toISOString(),
    type: a.consultationType.toLowerCase(),
    city: a.city ?? "",
    status: a.status.toLowerCase(),
    amount: parseNullableNumber(a.fee) ?? 0,
    payment_method: null,
    payment_status: a.paymentStatus.toLowerCase(),
    notes: a.notes ?? null,
    patient_id: a.patientId ?? null,
    doctor_id: a.doctorId ?? null,
    clinic_id: a.clinicId ?? null,
    cancellation_reason: a.cancellationReason ?? null,
    start_time: a.startTime ?? null,
    end_time: a.endTime ?? null,
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const conditions: SQL<unknown>[] = [];

  const status = normalizeUpper(req.query.status);
  const type = normalizeUpper(req.query.type);
  const doctorId = getQueryString(req.query.doctor_id);
  const patientId = getQueryString(req.query.patient_id);
  const city = getQueryString(req.query.city);
  const search = getQueryString(req.query.search);
  const dateFrom = parseDateFilter(req.query.date_from);
  const dateTo = parseDateFilter(req.query.date_to);

  if (status && status !== "ALL") {
    if (!isAppointmentStatus(status)) {
      res.status(400).json({ error: "Invalid appointment status" });
      return;
    }

    conditions.push(eq(appointmentsTable.status, status));
  }

  if (type) {
    if (!isConsultationType(type)) {
      res.status(400).json({ error: "Invalid consultation type" });
      return;
    }

    conditions.push(eq(appointmentsTable.consultationType, type));
  }

  if (doctorId) {
    conditions.push(eq(appointmentsTable.doctorId, doctorId));
  }

  if (patientId) {
    conditions.push(eq(appointmentsTable.patientId, patientId));
  }

  if (city) {
    conditions.push(ilike(appointmentsTable.city, `%${city}%`));
  }

  if (search) {
    const searchCondition = or(
      ilike(appointmentsTable.patientName, `%${search}%`),
      ilike(appointmentsTable.doctorName, `%${search}%`),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (getQueryString(req.query.date_from) && !dateFrom) {
    res.status(400).json({ error: "Invalid date_from" });
    return;
  }

  if (getQueryString(req.query.date_to) && !dateTo) {
    res.status(400).json({ error: "Invalid date_to" });
    return;
  }

  if (dateFrom) {
    conditions.push(gte(appointmentsTable.appointmentDate, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(appointmentsTable.appointmentDate, dateTo));
  }

  const all =
    conditions.length > 0
      ? await db
          .select()
          .from(appointmentsTable)
          .where(and(...conditions))
          .orderBy(desc(appointmentsTable.appointmentDate))
      : await db.select().from(appointmentsTable).orderBy(desc(appointmentsTable.appointmentDate));

  const { data, total, page, limit, totalPages } = paginate(
    all,
    parsePagination(req.query as Record<string, string>),
  );

  res.json({ data: data.map(mapAppointment), total, page, limit, totalPages });
});

router.get("/appointments/stats", async (_req, res): Promise<void> => {
  const all = await db.select({ status: appointmentsTable.status }).from(appointmentsTable);

  const total = all.length;
  const attended = all.filter((a) => a.status === "COMPLETED").length;
  const noShow = all.filter((a) => a.status === "NO_SHOW").length;
  const cancelled = all.filter((a) => a.status === "CANCELLED").length;

  res.json({
    total,
    attended,
    no_show: noShow,
    cancelled,
    completion_rate: total > 0 ? Math.round((attended / total) * 100) : 0,
  });
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const id = getRouteParam(req.params.id);

  if (!id) {
    res.status(400).json({ error: "Appointment id is required" });
    return;
  }

  const appt = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);

  if (!appt.length) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.json(mapAppointment(appt[0]));
});

async function updateAppointmentById(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req.params.id);

  if (!id) {
    res.status(400).json({ error: "Appointment id is required" });
    return;
  }

  const status = normalizeUpper(req.body?.status);
  const cancellationReason =
    typeof req.body?.cancellationReason === "string" ? req.body.cancellationReason.trim() : undefined;
  const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : undefined;

  if (!status || !isAppointmentStatus(status)) {
    res.status(400).json({ error: "Valid appointment status is required" });
    return;
  }

  const existing = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  if (status === "CANCELLED" && !cancellationReason && !existing[0].cancellationReason) {
    res.status(400).json({ error: "Cancellation reason is required when cancelling appointment" });
    return;
  }

  await db
    .update(appointmentsTable)
    .set({
      status,
      cancellationReason: cancellationReason ?? existing[0].cancellationReason,
      notes: notes ?? existing[0].notes,
      updatedAt: new Date(),
    })
    .where(eq(appointmentsTable.id, id));

  await writeAudit({
    req,
    actorId: req.admin!.userId,
    actorName: req.admin!.fullName,
    actorRole: req.admin!.role,
    action: "APPOINTMENT_STATUS_CHANGED",
    entityType: "Appointment",
    entityId: id,
    oldValue: {
      status: existing[0].status,
      cancellationReason: existing[0].cancellationReason,
      notes: existing[0].notes,
    },
    newValue: {
      status,
      cancellationReason: cancellationReason ?? existing[0].cancellationReason,
      notes: notes ?? existing[0].notes,
    },
  });

  const updated = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);

  res.json(mapAppointment(updated[0]));
}

router.patch(
  "/appointments/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"),
  updateAppointmentById,
);

router.patch(
  "/appointments/:id/status",
  requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"),
  updateAppointmentById,
);

export default router;
