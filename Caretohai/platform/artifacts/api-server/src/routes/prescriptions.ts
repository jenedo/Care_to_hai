import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, doctorsTable, patientsTable } from "../lib/db";
import { prescriptionsTable } from "../lib/db";
import { requireDoctorAuth, requireAnyAuth } from "../middlewares/auth";

const router = Router();

router.get("/prescriptions", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    const rows = await db
      .select()
      .from(prescriptionsTable)
      .where(eq(prescriptionsTable.doctorId, doctorId))
      .orderBy(desc(prescriptionsTable.createdAt))
      .limit(50);
    res.json({ data: rows, total: rows.length });
  } catch {
    res.status(500).json({ error: "Failed to fetch prescriptions" });
  }
});

router.get("/prescriptions/:id", requireAnyAuth, async (req, res): Promise<void> => {
  try {
    const [row] = await db
      .select()
      .from(prescriptionsTable)
      .where(eq(prescriptionsTable.id, req.params.id));
    if (!row) { res.status(404).json({ error: "Prescription not found" }); return; }
    res.json({ data: row });
  } catch {
    res.status(500).json({ error: "Failed to fetch prescription" });
  }
});

router.post("/prescriptions", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  const { patientId, sessionId, diagnosis, medicines, followUpDate, notes, doctorName, patientName } = req.body;

  if (!patientId) { res.status(400).json({ error: "patientId is required" }); return; }

  try {
    const [row] = await db
      .insert(prescriptionsTable)
      .values({
        doctorId,
        patientId,
        sessionId: sessionId ?? null,
        diagnosis: diagnosis ?? null,
        medicines: Array.isArray(medicines) ? medicines : [],
        followUpDate: followUpDate ?? null,
        notes: notes ?? null,
        doctorName: doctorName ?? null,
        patientName: patientName ?? null,
      })
      .returning();
    res.status(201).json({ data: row });
  } catch {
    res.status(500).json({ error: "Failed to create prescription" });
  }
});

export default router;
