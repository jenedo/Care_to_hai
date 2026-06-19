import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";
import { eq } from "drizzle-orm";
import { consultationSessionsTable, db } from "../lib/db";
import { canAccessConsultationSession } from "../lib/accessControl";
import { requireAnyAuth, type RequestAuth } from "../middlewares/auth";

const router = Router();

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? "";

router.post("/livekit/token", requireAnyAuth, async (req, res): Promise<void> => {
  const auth = req.auth as RequestAuth;
  const { roomName, participantName } = req.body as {
    roomName?: string;
    participantName?: string;
  };

  if (!roomName) {
    res.status(400).json({ error: "roomName is required (use consultation session id)" });
    return;
  }

  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    res.status(503).json({
      error: "LiveKit not configured",
      code: "LIVEKIT_NOT_CONFIGURED",
    });
    return;
  }

  try {
    const [session] = await db
      .select()
      .from(consultationSessionsTable)
      .where(eq(consultationSessionsTable.id, roomName));

    if (!session) {
      res.status(404).json({ error: "Consultation session not found" });
      return;
    }

    if (!canAccessConsultationSession(auth, session)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const identity =
      auth.role === "DOCTOR"
        ? `doctor-${auth.doctorId}`
        : auth.role === "PATIENT"
          ? `patient-${auth.patientId}`
          : `admin-${auth.adminId}`;

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: participantName ?? auth.fullName ?? identity,
      ttl: "1h",
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    res.json({
      data: {
        token: jwt,
        url: LIVEKIT_URL,
        roomName,
        identity,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to generate LiveKit token" });
  }
});

export default router;
