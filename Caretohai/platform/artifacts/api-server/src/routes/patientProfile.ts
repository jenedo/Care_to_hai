import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, patientsTable } from "../lib/db";
import { requirePatientAuth } from "../middlewares/auth";

const router = Router();

router.get("/patient/profile", requirePatientAuth, async (req, res): Promise<void> => {
  const patientId = (req as any).patientAuth.patientId;
  try {
    const [patient] = await db
      .select()
      .from(patientsTable)
      .where(eq(patientsTable.id, patientId));

    if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
    res.json({ data: patient });
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.patch("/patient/profile", requirePatientAuth, async (req, res): Promise<void> => {
  const patientId = (req as any).patientAuth.patientId;
  const { fullName, dateOfBirth, gender, bloodGroup, address, avatarUrl } = req.body;

  if (fullName !== undefined && typeof fullName === "string" && fullName.trim().length < 2) {
    res.status(400).json({ error: "Name must be at least 2 characters" });
    return;
  }

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName !== undefined) updates.fullName = (fullName as string).trim();
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updates.gender = gender;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
    if (address !== undefined) updates.address = address;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const [updated] = await db
      .update(patientsTable)
      .set(updates)
      .where(eq(patientsTable.id, patientId))
      .returning();

    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
