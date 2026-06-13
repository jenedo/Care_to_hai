import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, doctorsTable } from "../lib/db";
import { requireDoctorAuth } from "../middlewares/auth";

const router = Router();

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

export default router;
