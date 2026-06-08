import { Router } from "express";
import { eq, ilike, and, or, desc, gte, lte } from "drizzle-orm";
import { db, appointmentsTable } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

function mapAppointment(a: typeof appointmentsTable.$inferSelect) {
  return {
    id: a.id,
    patient_name: a.patientName,
    patient_age: a.patientAge != null ? parseInt(a.patientAge) || null : null,
    patient_gender: a.patientGender ?? null,
    doctor_name: a.doctorName,
    doctor_specialty: a.doctorSpecialty ?? null,
    date_time: a.appointmentDate.toISOString(),
    type: a.consultationType.toLowerCase(),
    city: a.city ?? "",
    status: a.status.toLowerCase(),
    amount: a.fee != null ? parseFloat(a.fee) : 0,
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
  const q = req.query as Record<string, string>;
  const conditions: any[] = [];
  if (q.status && q.status !== "all") conditions.push(eq(appointmentsTable.status, q.status.toUpperCase() as any));
  if (q.doctor_id) conditions.push(eq(appointmentsTable.doctorId, q.doctor_id));
  if (q.patient_id) conditions.push(eq(appointmentsTable.patientId, q.patient_id));
  if (q.city) conditions.push(ilike(appointmentsTable.city, `%${q.city}%`));
  if (q.type) conditions.push(eq(appointmentsTable.consultationType, q.type.toUpperCase() as any));
  if (q.search) conditions.push(or(
    ilike(appointmentsTable.patientName, `%${q.search}%`),
    ilike(appointmentsTable.doctorName, `%${q.search}%`),
  ));
  if (q.date_from) conditions.push(gte(appointmentsTable.appointmentDate, new Date(q.date_from)));
  if (q.date_to) conditions.push(lte(appointmentsTable.appointmentDate, new Date(q.date_to)));

  const all = conditions.length
    ? await db.select().from(appointmentsTable).where(and(...conditions)).orderBy(desc(appointmentsTable.appointmentDate))
    : await db.select().from(appointmentsTable).orderBy(desc(appointmentsTable.appointmentDate));

  const { data, total, page, limit, totalPages } = paginate(all, parsePagination(q));
  res.json({ data: data.map(mapAppointment), total, page, limit, totalPages });
});

router.get("/appointments/stats", async (_req, res) => {
  const all = await db.select({ status: appointmentsTable.status }).from(appointmentsTable);
  const total = all.length;
  const attended = all.filter(a => a.status === "COMPLETED").length;
  const no_show = all.filter(a => a.status === "NO_SHOW").length;
  const cancelled = all.filter(a => a.status === "CANCELLED").length;
  res.json({
    total,
    attended,
    no_show,
    cancelled,
    completion_rate: total > 0 ? Math.round((attended / total) * 100) : 0,
  });
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const appt = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, (req.params.id as string))).limit(1);
  if (!appt.length) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(mapAppointment(appt[0]));
});

async function updateAppointmentById(req: any, res: any): Promise<void> {
  const { status, cancellationReason, notes } = req.body;
  const existing = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Appointment not found" }); return; }
  const dbStatus = String(status).toUpperCase();
  await db.update(appointmentsTable).set({
    status: dbStatus as any,
    cancellationReason: cancellationReason ?? existing[0].cancellationReason,
    notes: notes ?? existing[0].notes,
    updatedAt: new Date(),
  }).where(eq(appointmentsTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "APPOINTMENT_STATUS_CHANGED", entityType: "Appointment", entityId: (req.params.id as string), oldValue: { status: existing[0].status }, newValue: { status: dbStatus } });
  const updated = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, (req.params.id as string))).limit(1);
  res.json(mapAppointment(updated[0]));
}

router.patch("/appointments/:id", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), updateAppointmentById);

router.patch("/appointments/:id/status", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), async (req, res): Promise<void> => {
  const { status, cancellationReason, notes } = req.body;
  const existing = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Appointment not found" }); return; }
  const dbStatus = String(status).toUpperCase();
  await db.update(appointmentsTable).set({
    status: dbStatus as any,
    cancellationReason: cancellationReason ?? existing[0].cancellationReason,
    notes: notes ?? existing[0].notes,
    updatedAt: new Date(),
  }).where(eq(appointmentsTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "APPOINTMENT_STATUS_CHANGED", entityType: "Appointment", entityId: (req.params.id as string), oldValue: { status: existing[0].status }, newValue: { status: dbStatus } });
  const updated = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, (req.params.id as string))).limit(1);
  res.json(mapAppointment(updated[0]));
});

export default router;
