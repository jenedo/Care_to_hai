import { Router } from "express";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import { requireDoctorAuth, requirePatientAuth, requireAnyAuth } from "../middlewares/auth";

const router = Router();

const APP_ID = process.env.AGORA_APP_ID ?? "";
const APP_CERTIFICATE = process.env.AGORA_PRIMARY_CERTIFICATE ?? "";

router.post("/agora/token", requireAnyAuth, async (req, res): Promise<void> => {
  const { channelName, uid = 0, role = "publisher" } = req.body;

  if (!channelName) {
    res.status(400).json({ error: "channelName is required" });
    return;
  }

  if (!APP_ID || !APP_CERTIFICATE) {
    res.status(500).json({ error: "Agora credentials not configured" });
    return;
  }

  try {
    const expirationSecs = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationSecs;
    const rtcRole = role === "audience" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      Number(uid),
      rtcRole,
      privilegeExpiredTs,
      privilegeExpiredTs
    );

    res.json({ data: { token, appId: APP_ID, channelName, uid, expiresAt: privilegeExpiredTs } });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate Agora token" });
  }
});

export default router;
