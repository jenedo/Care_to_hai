import { Router } from "express";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { db, refundsTable } from "../lib/db";
import { requireAuth, requireRole, FINANCE_AND_ABOVE } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

function mapRefund(r: typeof refundsTable.$inferSelect) {
  return {
    id: r.id,
    patient_name: r.requestedByName ?? "Unknown",
    doctor_name: null,
    amount: r.amount != null ? parseFloat(r.amount) : 0,
    reason: r.reason ?? "",
    status: r.status,
    requested_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    payment_id: r.paymentId ?? null,
    appointment_id: r.appointmentId ?? null,
    admin_notes: r.adminNotes ?? null,
    requested_by: r.requestedBy ?? null,
  };
}

router.get("/refunds", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const conds: any[] = [];
  if (q.status && q.status !== "all") conds.push(eq(refundsTable.status, q.status as any));
  if (q.search) conds.push(or(ilike(refundsTable.requestedByName, `%${q.search}%`), ilike(refundsTable.reason, `%${q.search}%`)));
  const all = conds.length
    ? await db.select().from(refundsTable).where(and(...conds)).orderBy(desc(refundsTable.createdAt))
    : await db.select().from(refundsTable).orderBy(desc(refundsTable.createdAt));
  const { data, total, page, limit, totalPages } = paginate(all, parsePagination(q));
  res.json({ data: data.map(mapRefund), total, page, limit, totalPages });
});

router.get("/refunds/stats", async (_req, res) => {
  const all = await db.select({ status: refundsTable.status }).from(refundsTable);
  res.json({
    total: all.length,
    pending: all.filter(r => r.status === "REQUESTED").length,
    approved: all.filter(r => r.status === "APPROVED").length,
    processed: all.filter(r => r.status === "PROCESSED").length,
    rejected: all.filter(r => r.status === "REJECTED").length,
  });
});

router.get("/refunds/:id", async (req, res): Promise<void> => {
  const refund = await db.select().from(refundsTable).where(eq(refundsTable.id, (req.params.id as string))).limit(1);
  if (!refund.length) { res.status(404).json({ error: "Refund not found" }); return; }
  res.json(mapRefund(refund[0]));
});

router.patch("/refunds/:id", requireRole(...FINANCE_AND_ABOVE), async (req, res): Promise<void> => {
  const { status, adminNotes, admin_notes } = req.body;
  const notes = adminNotes ?? admin_notes;
  const existing = await db.select().from(refundsTable).where(eq(refundsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Refund not found" }); return; }
  await db.update(refundsTable)
    .set({ status, adminNotes: notes ?? existing[0].adminNotes, reviewedByAdminId: req.admin!.adminId, updatedAt: new Date() })
    .where(eq(refundsTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "REFUND_STATUS_CHANGED", entityType: "Refund", entityId: (req.params.id as string), oldValue: { status: existing[0].status }, newValue: { status } });
  const updated = await db.select().from(refundsTable).where(eq(refundsTable.id, (req.params.id as string))).limit(1);
  res.json(mapRefund(updated[0]));
});

export default router;
