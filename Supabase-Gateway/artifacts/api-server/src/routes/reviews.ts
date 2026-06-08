import { Router } from "express";
import { eq, and, desc, ilike, or, avg } from "drizzle-orm";
import { db, reviewsTable } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

router.get("/reviews", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const conds: any[] = [];
  if (q.status && q.status !== "all") conds.push(eq(reviewsTable.status, q.status as any));
  if (q.doctorId) conds.push(eq(reviewsTable.doctorId, q.doctorId));
  if (q.search) conds.push(or(ilike(reviewsTable.patientName, `%${q.search}%`), ilike(reviewsTable.doctorName, `%${q.search}%`)));
  const all = conds.length
    ? await db.select().from(reviewsTable).where(and(...conds)).orderBy(desc(reviewsTable.createdAt))
    : await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  const result = paginate(all, parsePagination(q));
  res.json(result);
});

router.get("/reviews/stats", async (_req, res) => {
  const all = await db.select({ status: reviewsTable.status, rating: reviewsTable.rating }).from(reviewsTable);
  const avgRating = all.length ? (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1) : "0.0";
  res.json({
    total: all.length,
    pending: all.filter(r => r.status === "PENDING").length,
    published: all.filter(r => r.status === "PUBLISHED").length,
    reported: all.filter(r => r.status === "REPORTED").length,
    hidden: all.filter(r => r.status === "HIDDEN").length,
    avg_rating: avgRating,
  });
});

router.get("/reviews/:id", async (req, res): Promise<void> => {
  const review = await db.select().from(reviewsTable).where(eq(reviewsTable.id, (req.params.id as string))).limit(1);
  if (!review.length) { res.status(404).json({ error: "Review not found" }); return; }
  res.json(review[0]);
});

router.patch("/reviews/:id", requireRole("SUPER_ADMIN", "ADMIN", "SUPPORT"), async (req, res): Promise<void> => {
  const { status } = req.body;
  const existing = await db.select().from(reviewsTable).where(eq(reviewsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Review not found" }); return; }
  await db.update(reviewsTable)
    .set({ status, moderatedByAdminId: req.admin!.adminId, moderatedAt: new Date(), updatedAt: new Date() })
    .where(eq(reviewsTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "REVIEW_MODERATED", entityType: "Review", entityId: (req.params.id as string), oldValue: { status: existing[0].status }, newValue: { status } });
  const updated = await db.select().from(reviewsTable).where(eq(reviewsTable.id, (req.params.id as string))).limit(1);
  res.json(updated[0]);
});

export default router;
