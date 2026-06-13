import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  consultationSessionsTable,
  db,
  doctorsTable,
  freeTrialRecordsTable,
  patientsTable,
  sessionMessagesTable,
} from "../lib/db";
import {
  requireAuth,
  requireAnyAuth,
  requireRole,
  requirePatientAuth,
  requireDoctorAuth,
  requireDoctorOrPatientAuth,
} from "../middlewares/auth";

const router = Router();

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().split("T")[0];
}

function getIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/* ─── Admin: list all sessions ─── */
router.get(
  "/consultations",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"),
  async (req, res): Promise<void> => {
    try {
      const sessions = await db
        .select({
          id: consultationSessionsTable.id,
          type: consultationSessionsTable.type,
          status: consultationSessionsTable.status,
          isFreeTrial: consultationSessionsTable.isFreeTrial,
          isPaid: consultationSessionsTable.isPaid,
          paymentAmount: consultationSessionsTable.paymentAmount,
          durationSeconds: consultationSessionsTable.durationSeconds,
          startedAt: consultationSessionsTable.startedAt,
          endedAt: consultationSessionsTable.endedAt,
          createdAt: consultationSessionsTable.createdAt,
          patientName: patientsTable.fullName,
          patientId: consultationSessionsTable.patientId,
          doctorName: doctorsTable.fullName,
          doctorId: consultationSessionsTable.doctorId,
          doctorSpecialty: doctorsTable.specialty,
        })
        .from(consultationSessionsTable)
        .leftJoin(patientsTable, eq(consultationSessionsTable.patientId, patientsTable.id))
        .leftJoin(doctorsTable, eq(consultationSessionsTable.doctorId, doctorsTable.id))
        .orderBy(desc(consultationSessionsTable.createdAt))
        .limit(100);

      res.json({ data: sessions, total: sessions.length });
    } catch {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);

/* ─── Admin: doctor stats ─── */
router.get(
  "/consultations/doctor/:doctorId/stats",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res): Promise<void> => {
    try {
      const sessions = await db
        .select()
        .from(consultationSessionsTable)
        .where(
          and(
            eq(consultationSessionsTable.doctorId, req.params.doctorId),
            eq(consultationSessionsTable.status, "COMPLETED")
          )
        );

      res.json({
        data: {
          totalCompleted: sessions.length,
          chatSessions: sessions.filter((s) => s.type === "CHAT").length,
          videoSessions: sessions.filter((s) => s.type === "VIDEO").length,
          audioSessions: sessions.filter((s) => s.type === "AUDIO").length,
          avgDurationSeconds: sessions.length
            ? sessions.reduce((s, x) => s + x.durationSeconds, 0) / sessions.length
            : 0,
        },
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  }
);

/* ─── Admin OR doctor/patient: get single session with messages ─── */
router.get(
  "/consultations/:id",
  requireAnyAuth,
  async (req, res): Promise<void> => {
    try {
      const [session] = await db
        .select()
        .from(consultationSessionsTable)
        .where(eq(consultationSessionsTable.id, req.params.id));

      if (!session) { res.status(404).json({ error: "Session not found" }); return; }

      const messages = await db
        .select()
        .from(sessionMessagesTable)
        .where(eq(sessionMessagesTable.sessionId, session.id))
        .orderBy(sessionMessagesTable.createdAt);

      res.json({ data: { ...session, messages } });
    } catch {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  }
);

/* ─── Patient: create consultation session ─── */
router.post(
  "/consultations",
  requirePatientAuth,
  async (req, res): Promise<void> => {
    const auth = (req as any).patientAuth;
    const { doctorId, type = "CHAT" } = req.body;

    if (!doctorId) { res.status(400).json({ error: "doctorId is required" }); return; }

    try {
      const weekStart = getWeekStart(new Date());
      const ip = getIp(req);

      const existingTrial = await db
        .select()
        .from(freeTrialRecordsTable)
        .where(
          and(
            eq(freeTrialRecordsTable.patientId, auth.patientId),
            eq(freeTrialRecordsTable.weekStart, weekStart)
          )
        );

      const isFreeTrial = existingTrial.length === 0;

      const [session] = await db
        .insert(consultationSessionsTable)
        .values({
          patientId: auth.patientId,
          doctorId,
          type: type as any,
          status: "WAITING",
          isFreeTrial,
          isPaid: false,
          perSessionFee: "75",
          freeSecondsLimit: 120,
        })
        .returning();

      if (isFreeTrial) {
        await db.insert(freeTrialRecordsTable).values({
          patientId: auth.patientId,
          sessionId: session.id,
          ipAddress: ip,
          deviceFingerprint: req.headers["x-device-fingerprint"] as string | undefined,
          weekStart,
        });
      }

      res.status(201).json({ data: session });
    } catch {
      res.status(500).json({ error: "Failed to create consultation" });
    }
  }
);

/* ─── Doctor: start session ─── */
router.patch(
  "/consultations/:id/start",
  requireDoctorAuth,
  async (req, res): Promise<void> => {
    try {
      const [session] = await db
        .select()
        .from(consultationSessionsTable)
        .where(eq(consultationSessionsTable.id, req.params.id));

      if (!session) { res.status(404).json({ error: "Session not found" }); return; }

      const [updated] = await db
        .update(consultationSessionsTable)
        .set({ status: "ACTIVE", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(consultationSessionsTable.id, session.id))
        .returning();

      res.json({ data: updated });
    } catch {
      res.status(500).json({ error: "Failed to start session" });
    }
  }
);

/* ─── Doctor or patient: complete session ─── */
router.patch(
  "/consultations/:id/complete",
  requireDoctorOrPatientAuth,
  async (req, res): Promise<void> => {
    const { durationSeconds } = req.body;
    try {
      const [updated] = await db
        .update(consultationSessionsTable)
        .set({
          status: "COMPLETED",
          endedAt: new Date(),
          durationSeconds: durationSeconds ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(consultationSessionsTable.id, req.params.id))
        .returning();

      res.json({ data: updated });
    } catch {
      res.status(500).json({ error: "Failed to complete session" });
    }
  }
);

/* ─── Patient: pay for extra time ─── */
router.patch(
  "/consultations/:id/pay",
  requirePatientAuth,
  async (req, res): Promise<void> => {
    try {
      const [updated] = await db
        .update(consultationSessionsTable)
        .set({ isPaid: true, paymentAmount: "75", updatedAt: new Date() })
        .where(eq(consultationSessionsTable.id, req.params.id))
        .returning();

      res.json({ data: updated });
    } catch {
      res.status(500).json({ error: "Failed to process payment" });
    }
  }
);

/* ─── Doctor or patient: send message ─── */
router.post(
  "/consultations/:id/messages",
  requireDoctorOrPatientAuth,
  async (req, res): Promise<void> => {
    const auth = (req as any).auth;
    const { content, messageType = "TEXT" } = req.body;

    if (!content?.trim()) { res.status(400).json({ error: "Message content required" }); return; }

    try {
      const [session] = await db
        .select()
        .from(consultationSessionsTable)
        .where(eq(consultationSessionsTable.id, req.params.id));

      if (!session || session.status === "COMPLETED" || session.status === "ABANDONED") {
        res.status(400).json({ error: "Session is not active" }); return;
      }

      const senderRole = auth.role;
      const senderName = auth.fullName ?? auth.email;

      const [msg] = await db
        .insert(sessionMessagesTable)
        .values({
          sessionId: session.id,
          senderRole,
          senderId: auth.userId,
          senderName,
          content: content.trim(),
          messageType,
        })
        .returning();

      res.status(201).json({ data: msg });
    } catch {
      res.status(500).json({ error: "Failed to send message" });
    }
  }
);

/* ─── Doctor or patient: get messages ─── */
router.get(
  "/consultations/:id/messages",
  requireDoctorOrPatientAuth,
  async (req, res): Promise<void> => {
    try {
      const messages = await db
        .select()
        .from(sessionMessagesTable)
        .where(eq(sessionMessagesTable.sessionId, req.params.id))
        .orderBy(sessionMessagesTable.createdAt);

      res.json({ data: messages });
    } catch {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }
);

export default router;
