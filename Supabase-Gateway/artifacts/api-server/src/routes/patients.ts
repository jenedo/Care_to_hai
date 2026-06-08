import { Router } from "express";
import { eq, ilike, and, or, desc } from "drizzle-orm";
import { db, patientsTable } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

function mapPatient(p: typeof patientsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.fullName,
    phone: p.phone ?? "",
    email: p.email ?? null,
    city: p.city ?? "",
    status: p.status.toLowerCase(),
    joined_date: p.createdAt.toISOString(),
    avatar_url: p.avatarUrl ?? null,
    total_bookings: p.totalAppointments ?? 0,
    total_spent: null,
    upcoming_bookings: null,
    gender: p.gender ?? null,
    date_of_birth: p.dateOfBirth ?? null,
    blood_group: p.bloodGroup ?? null,
    area: p.area ?? null,
    address: p.address ?? null,
    emergency_contact: p.emergencyContact ?? null,
  };
}

router.get("/patients", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const conditions: any[] = [];
  if (q.status && q.status !== "all") conditions.push(eq(patientsTable.status, q.status.toUpperCase() as any));
  if (q.city) conditions.push(ilike(patientsTable.city, `%${q.city}%`));
  if (q.search) conditions.push(or(
    ilike(patientsTable.fullName, `%${q.search}%`),
    ilike(patientsTable.email, `%${q.search}%`),
    ilike(patientsTable.phone, `%${q.search}%`),
  ));

  const all = conditions.length
    ? await db.select().from(patientsTable).where(and(...conditions)).orderBy(desc(patientsTable.createdAt))
    : await db.select().from(patientsTable).orderBy(desc(patientsTable.createdAt));

  const { data, total, page, limit, totalPages } = paginate(all, parsePagination(q));
  res.json({ data: data.map(mapPatient), total, page, limit, totalPages });
});

router.get("/patients/stats", async (_req, res) => {
  const all = await db.select({ status: patientsTable.status }).from(patientsTable);
  res.json({
    total: all.length,
    active: all.filter(p => p.status === "ACTIVE").length,
    inactive: all.filter(p => p.status === "INACTIVE").length,
    suspended: all.filter(p => p.status === "SUSPENDED").length,
  });
});

router.get("/patients/:id", async (req, res): Promise<void> => {
  const patient = await db.select().from(patientsTable).where(eq(patientsTable.id, (req.params.id as string))).limit(1);
  if (!patient.length) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(mapPatient(patient[0]));
});

router.patch("/patients/:id/status", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), async (req, res): Promise<void> => {
  const { status } = req.body;
  const existing = await db.select().from(patientsTable).where(eq(patientsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Patient not found" }); return; }
  const dbStatus = String(status).toUpperCase();
  await db.update(patientsTable).set({ status: dbStatus as any, updatedAt: new Date() }).where(eq(patientsTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "PATIENT_STATUS_CHANGED", entityType: "Patient", entityId: (req.params.id as string), oldValue: { status: existing[0].status }, newValue: { status: dbStatus } });
  const updated = await db.select().from(patientsTable).where(eq(patientsTable.id, (req.params.id as string))).limit(1);
  res.json(mapPatient(updated[0]));
});

router.patch("/patients/:id/block", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), async (req, res): Promise<void> => {
  const { blocked } = req.body;
  const existing = await db.select().from(patientsTable).where(eq(patientsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Patient not found" }); return; }
  const dbStatus = blocked ? "SUSPENDED" : "ACTIVE";
  await db.update(patientsTable).set({ status: dbStatus as any, updatedAt: new Date() }).where(eq(patientsTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: blocked ? "PATIENT_BLOCKED" : "PATIENT_UNBLOCKED", entityType: "Patient", entityId: (req.params.id as string) });
  const updated = await db.select().from(patientsTable).where(eq(patientsTable.id, (req.params.id as string))).limit(1);
  res.json(mapPatient(updated[0]));
});

export default router;
