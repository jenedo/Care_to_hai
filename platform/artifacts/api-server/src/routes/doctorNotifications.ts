import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  notificationsTable,
  doctorsTable,
  patientsTable,
  appointmentsTable,
  prescriptionsTable,
} from "../lib/db";
import { requireDoctorAuth } from "../middlewares/auth";

const router = Router();

router.get("/doctor/notifications", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));
    if (!doctor?.userId) { res.json({ data: [], total: 0 }); return; }

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, doctor.userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    res.json({ data: rows, total: rows.length });
  } catch {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch("/doctor/notifications/:id/read", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));
    if (!doctor?.userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const [updated] = await db
      .update(notificationsTable)
      .set({ status: "READ", readAt: new Date() })
      .where(and(eq(notificationsTable.id, req.params.id), eq(notificationsTable.userId, doctor.userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }
    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

router.post("/doctor/notifications/mark-all-read", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));
    if (!doctor?.userId) { res.json({ data: { updated: 0 } }); return; }

    await db
      .update(notificationsTable)
      .set({ status: "READ", readAt: new Date() })
      .where(and(eq(notificationsTable.userId, doctor.userId), eq(notificationsTable.status, "PENDING")));

    res.json({ data: { updated: true } });
  } catch {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

router.get("/doctor/patient/:patientId", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  const { patientId } = req.params;

  try {
    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, patientId));
    if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }

    const appointments = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.doctorId, doctorId), eq(appointmentsTable.patientId, patientId)))
      .orderBy(desc(appointmentsTable.appointmentDate))
      .limit(20);

    const prescriptions = await db
      .select()
      .from(prescriptionsTable)
      .where(and(eq(prescriptionsTable.doctorId, doctorId), eq(prescriptionsTable.patientId, patientId)))
      .orderBy(desc(prescriptionsTable.createdAt))
      .limit(10);

    if (appointments.length === 0 && prescriptions.length === 0) {
      res.status(403).json({ error: "No care relationship with this patient" });
      return;
    }

    res.json({ data: { patient, appointments, prescriptions } });
  } catch {
    res.status(500).json({ error: "Failed to fetch patient details" });
  }
});

export default router;
