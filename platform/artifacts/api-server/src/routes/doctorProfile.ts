import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, doctorsTable, doctorVerificationsTable } from "../lib/db";
import { requireDoctorAuth } from "../middlewares/auth";

const router = Router();

const DOC_FIELD_MAP: Record<string, keyof typeof doctorVerificationsTable.$inferInsert> = {
  cnic_front: "cnicFrontUrl",
  cnic_back: "cnicBackUrl",
  degree: "degreeUrl",
};

router.get("/doctor/profile", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    const [doctor] = await db
      .select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, doctorId));

    if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }
    res.json({ data: doctor });
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.patch("/doctor/profile", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  const { fullName, avatarUrl, bio, city, phone, consultationFee } = req.body;

  if (fullName !== undefined && typeof fullName === "string" && fullName.trim().length < 2) {
    res.status(400).json({ error: "Name must be at least 2 characters" });
    return;
  }

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName !== undefined) updates.fullName = (fullName as string).trim();
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (bio !== undefined) updates.bio = bio;
    if (city !== undefined) updates.city = city;
    if (phone !== undefined) updates.phone = phone;
    if (consultationFee !== undefined) updates.consultationFee = consultationFee;

    const [updated] = await db
      .update(doctorsTable)
      .set(updates)
      .where(eq(doctorsTable.id, doctorId))
      .returning();

    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/doctor/verification/document", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  const { type, url } = req.body as { type?: string; url?: string };

  if (!type || !url || typeof url !== "string") {
    res.status(400).json({ error: "type and url are required" });
    return;
  }

  try {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));
    if (!doctor) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(doctorVerificationsTable)
      .where(eq(doctorVerificationsTable.doctorId, doctorId))
      .limit(1);

    if (type === "certificate") {
      const certs = existing?.certificateUrl ?? [];
      const nextCerts = [...certs, url];
      if (existing) {
        await db
          .update(doctorVerificationsTable)
          .set({ certificateUrl: nextCerts, status: "PENDING", updatedAt: new Date() })
          .where(eq(doctorVerificationsTable.id, existing.id));
      } else {
        await db.insert(doctorVerificationsTable).values({
          doctorId,
          certificateUrl: [url],
          status: "PENDING",
        });
      }
    } else {
      const field = DOC_FIELD_MAP[type];
      if (!field) {
        res.status(400).json({ error: "Invalid document type" });
        return;
      }
      if (existing) {
        await db
          .update(doctorVerificationsTable)
          .set({ [field]: url, status: "PENDING", updatedAt: new Date() })
          .where(eq(doctorVerificationsTable.id, existing.id));
      } else {
        await db.insert(doctorVerificationsTable).values({
          doctorId,
          [field]: url,
          status: "PENDING",
        });
      }
    }

    if (doctor.verificationStatus === "INCOMPLETE") {
      await db
        .update(doctorsTable)
        .set({ verificationStatus: "PENDING", updatedAt: new Date() })
        .where(eq(doctorsTable.id, doctorId));
    }

    res.json({ success: true, data: { type, url } });
  } catch {
    res.status(500).json({ error: "Failed to save verification document" });
  }
});

export default router;
