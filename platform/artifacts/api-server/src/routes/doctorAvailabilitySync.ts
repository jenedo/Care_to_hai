import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, doctorAvailabilityTable } from "../lib/db";
import { requireDoctorAuth } from "../middlewares/auth";

const router = Router();

router.get("/doctor/availability", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  try {
    const rows = await db
      .select()
      .from(doctorAvailabilityTable)
      .where(eq(doctorAvailabilityTable.doctorId, doctorId));
    res.json({ data: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

router.put("/doctor/availability", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  const { slots } = req.body;

  if (!Array.isArray(slots)) {
    res.status(400).json({ error: "slots must be an array" });
    return;
  }

  try {
    await db.delete(doctorAvailabilityTable).where(eq(doctorAvailabilityTable.doctorId, doctorId));

    if (slots.length > 0) {
      await db.insert(doctorAvailabilityTable).values(
        slots.map((s: any) => ({
          doctorId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: s.slotDurationMinutes ?? 30,
          consultationType: s.consultationType ?? "ONLINE",
          isActive: s.isActive ?? true,
        }))
      );
    }

    const rows = await db
      .select()
      .from(doctorAvailabilityTable)
      .where(eq(doctorAvailabilityTable.doctorId, doctorId));

    res.json({ data: rows });
  } catch {
    res.status(500).json({ error: "Failed to save availability" });
  }
});

export default router;
