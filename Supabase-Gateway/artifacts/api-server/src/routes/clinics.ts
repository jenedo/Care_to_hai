import { Router } from "express";
import { eq, and, desc, ilike } from "drizzle-orm";
import { db, clinicsTable } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

router.get("/clinics", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const conds: any[] = [];
  if (q.status && q.status !== "all") conds.push(eq(clinicsTable.status, q.status as any));
  if (q.city) conds.push(ilike(clinicsTable.city, `%${q.city}%`));
  if (q.search) conds.push(ilike(clinicsTable.name, `%${q.search}%`));
  const all = conds.length
    ? await db.select().from(clinicsTable).where(and(...conds)).orderBy(desc(clinicsTable.createdAt))
    : await db.select().from(clinicsTable).orderBy(desc(clinicsTable.createdAt));
  const result = paginate(all, parsePagination(q));
  res.json(result);
});

router.get("/clinics/:id", async (req, res): Promise<void> => {
  const clinic = await db.select().from(clinicsTable).where(eq(clinicsTable.id, (req.params.id as string))).limit(1);
  if (!clinic.length) { res.status(404).json({ error: "Clinic not found" }); return; }
  res.json(clinic[0]);
});

router.post("/clinics", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res): Promise<void> => {
  const { name, phone, address, city, area } = req.body;
  if (!name) { res.status(400).json({ error: "Clinic name is required" }); return; }
  const newClinic = await db.insert(clinicsTable).values({ name, phone, address, city, area, status: "ACTIVE" }).returning();
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "CLINIC_CREATED", entityType: "Clinic", entityId: newClinic[0].id, newValue: newClinic[0] });
  res.status(201).json(newClinic[0]);
});

router.patch("/clinics/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res): Promise<void> => {
  const existing = await db.select().from(clinicsTable).where(eq(clinicsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Clinic not found" }); return; }
  const { id: _id, createdAt: _c, ...allowed } = req.body;
  const updated = await db.update(clinicsTable).set({ ...allowed, updatedAt: new Date() }).where(eq(clinicsTable.id, (req.params.id as string))).returning();
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "CLINIC_UPDATED", entityType: "Clinic", entityId: (req.params.id as string) });
  res.json(updated[0]);
});

router.delete("/clinics/:id", requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const existing = await db.select().from(clinicsTable).where(eq(clinicsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Clinic not found" }); return; }
  await db.update(clinicsTable).set({ status: "INACTIVE", updatedAt: new Date() }).where(eq(clinicsTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "CLINIC_DEACTIVATED", entityType: "Clinic", entityId: (req.params.id as string) });
  res.status(204).send();
});

export default router;
