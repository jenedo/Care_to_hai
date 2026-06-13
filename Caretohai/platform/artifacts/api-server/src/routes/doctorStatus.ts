import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  doctorsTable,
  consultationRequestsTable,
  patientsTable,
  consultationSessionsTable,
  freeTrialRecordsTable,
} from "../lib/db";
import { requireDoctorAuth, requirePatientAuth } from "../middlewares/auth";
import { randomUUID } from "node:crypto";

const router = Router();

/* ─── Doctor: set own online status ─── */
router.patch("/doctor/status", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  const { status } = req.body;

  const valid = ["ONLINE", "BUSY", "OFFLINE"];
  if (!status || !valid.includes(status)) {
    res.status(400).json({ error: "status must be ONLINE, BUSY, or OFFLINE" });
    return;
  }

  try {
    await db
      .update(doctorsTable)
      .set({ onlineStatus: status, lastSeenAt: new Date(), updatedAt: new Date() } as any)
      .where(eq(doctorsTable.id, doctorId));

    res.json({ data: { id: doctorId, onlineStatus: status } });
  } catch {
    res.status(500).json({ error: "Failed to update status" });
  }
});

/* ─── Doctor: heartbeat while online ─── */
router.post("/doctor/heartbeat", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    await db
      .update(doctorsTable)
      .set({ lastSeenAt: new Date() } as any)
      .where(eq(doctorsTable.id, doctorId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Heartbeat failed" });
  }
});

/* ─── Doctor: list pending patient requests ─── */
router.get("/consultation-requests/doctor", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    const requests = await db
      .select({
        id: consultationRequestsTable.id,
        type: consultationRequestsTable.type,
        message: consultationRequestsTable.message,
        status: consultationRequestsTable.status,
        preferredTime: consultationRequestsTable.preferredTime,
        sessionId: consultationRequestsTable.sessionId,
        createdAt: consultationRequestsTable.createdAt,
        patientId: consultationRequestsTable.patientId,
        patientName: patientsTable.fullName,
        patientPhone: patientsTable.phone,
      })
      .from(consultationRequestsTable)
      .leftJoin(patientsTable, eq(consultationRequestsTable.patientId, patientsTable.id))
      .where(
        and(
          eq(consultationRequestsTable.doctorId, doctorId),
          eq(consultationRequestsTable.status, "PENDING")
        )
      )
      .orderBy(desc(consultationRequestsTable.createdAt))
      .limit(50);

    res.json({ data: requests, total: requests.length });
  } catch {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

/* ─── Patient: create a request for an offline doctor ─── */
router.post("/consultation-requests", requirePatientAuth, async (req, res): Promise<void> => {
  const patientId = (req as any).patientAuth.patientId;
  const { doctorId, type = "CHAT", message, preferredTime } = req.body;

  if (!doctorId) { res.status(400).json({ error: "doctorId is required" }); return; }

  try {
    const [request] = await db
      .insert(consultationRequestsTable)
      .values({
        id: randomUUID(),
        patientId,
        doctorId,
        type,
        message: message ?? null,
        status: "PENDING",
        preferredTime: preferredTime ? new Date(preferredTime) : null,
      })
      .returning();

    res.status(201).json({ data: request });
  } catch {
    res.status(500).json({ error: "Failed to create request" });
  }
});

/* ─── Doctor: accept request → create session ─── */
router.patch("/consultation-requests/:id/accept", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    const [request] = await db
      .select()
      .from(consultationRequestsTable)
      .where(
        and(
          eq(consultationRequestsTable.id, req.params.id),
          eq(consultationRequestsTable.doctorId, doctorId)
        )
      );

    if (!request) { res.status(404).json({ error: "Request not found" }); return; }

    const weekStart = (() => {
      const d = new Date();
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      d.setUTCDate(diff);
      return d.toISOString().split("T")[0];
    })();

    const existingTrial = await db
      .select()
      .from(freeTrialRecordsTable)
      .where(
        and(
          eq(freeTrialRecordsTable.patientId, request.patientId),
          eq(freeTrialRecordsTable.weekStart, weekStart)
        )
      );
    const isFreeTrial = existingTrial.length === 0;

    const [session] = await db
      .insert(consultationSessionsTable)
      .values({
        patientId: request.patientId,
        doctorId,
        type: request.type,
        status: "WAITING",
        isFreeTrial,
        isPaid: false,
        perSessionFee: "75",
        freeSecondsLimit: 120,
      })
      .returning();

    if (isFreeTrial) {
      await db.insert(freeTrialRecordsTable).values({
        patientId: request.patientId,
        sessionId: session.id,
        weekStart,
      });
    }

    await db
      .update(consultationRequestsTable)
      .set({ status: "ACCEPTED", sessionId: session.id, updatedAt: new Date() } as any)
      .where(eq(consultationRequestsTable.id, request.id));

    res.json({ data: { request: { ...request, status: "ACCEPTED" }, session } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept request" });
  }
});

/* ─── Doctor: decline request ─── */
router.patch("/consultation-requests/:id/decline", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  const { reason } = req.body;
  try {
    await db
      .update(consultationRequestsTable)
      .set({ status: "DECLINED", declinedReason: reason ?? null, updatedAt: new Date() } as any)
      .where(
        and(
          eq(consultationRequestsTable.id, req.params.id),
          eq(consultationRequestsTable.doctorId, doctorId)
        )
      );
    res.json({ data: { declined: true } });
  } catch {
    res.status(500).json({ error: "Failed to decline request" });
  }
});

/* ─── Patient: own request history ─── */
router.get("/consultation-requests/patient", requirePatientAuth, async (req, res): Promise<void> => {
  const patientId = (req as any).patientAuth.patientId;
  try {
    const requests = await db
      .select()
      .from(consultationRequestsTable)
      .where(eq(consultationRequestsTable.patientId, patientId))
      .orderBy(desc(consultationRequestsTable.createdAt))
      .limit(20);
    res.json({ data: requests, total: requests.length });
  } catch {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

export default router;
