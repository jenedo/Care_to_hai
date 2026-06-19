import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { appointmentsTable, db } from "../lib/db";
import { requirePatientAuth } from "../middlewares/auth";
import { parsePagination, paginate } from "../lib/pagination";

const router = Router();

function parseNullableNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function getRouteParam(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

router.get("/patient/appointments", requirePatientAuth, async (req, res): Promise<void> => {
  const patientId = req.patientAuth?.patientId ?? req.patient?.patientId;

  if (!patientId) {
    res.status(401).json({ error: "Patient authentication required" });
    return;
  }

  const rows = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.patientId, patientId))
    .orderBy(desc(appointmentsTable.appointmentDate));

  const { data, total, page, limit, totalPages } = paginate(
    rows,
    parsePagination(req.query as Record<string, string>),
  );

  res.json({
    data: data.map(mapAppointment),
    total,
    page,
    limit,
    totalPages,
  });
});

router.get("/patient/appointments/:id", requirePatientAuth, async (req, res): Promise<void> => {
  const patientId = req.patientAuth?.patientId ?? req.patient?.patientId;
  const id = getRouteParam(req.params.id);

  if (!patientId) {
    res.status(401).json({ error: "Patient authentication required" });
    return;
  }

  if (!id) {
    res.status(400).json({ error: "Appointment id is required" });
    return;
  }

  const appt = await db
    .select()
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.patientId, patientId)))
    .limit(1);

  if (!appt.length) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.json({ data: mapAppointment(appt[0]) });
});

export default router;
