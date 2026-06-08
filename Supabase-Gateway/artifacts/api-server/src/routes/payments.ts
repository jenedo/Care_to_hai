import { Router } from "express";
import { eq, and, desc, ilike, or, gte, lte } from "drizzle-orm";
import { db, paymentsTable } from "../lib/db";
import { requireAuth } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

function mapPayment(p: typeof paymentsTable.$inferSelect) {
  return {
    id: p.id,
    amount: parseFloat(p.amount),
    gateway: p.method,
    status: p.status.toLowerCase(),
    date: p.createdAt.toISOString(),
    patient_name: p.patientName ?? "",
    doctor_name: p.doctorName ?? null,
    appointment_id: p.appointmentId ?? null,
    consultation_fee: null,
    platform_fee: null,
    tax: null,
    refund_status: null,
    transaction_ref: p.transactionRef ?? null,
  };
}

router.get("/payments", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const conditions: any[] = [];
  if (q.status && q.status !== "all") conditions.push(eq(paymentsTable.status, q.status.toUpperCase() as any));
  if (q.gateway && q.gateway !== "all") conditions.push(eq(paymentsTable.method, q.gateway.toUpperCase() as any));
  if (q.doctor_id) conditions.push(eq(paymentsTable.doctorId, q.doctor_id));
  if (q.date_from) conditions.push(gte(paymentsTable.createdAt, new Date(q.date_from)));
  if (q.date_to) conditions.push(lte(paymentsTable.createdAt, new Date(q.date_to)));
  if (q.search) conditions.push(or(
    ilike(paymentsTable.patientName, `%${q.search}%`),
    ilike(paymentsTable.doctorName, `%${q.search}%`),
    ilike(paymentsTable.transactionRef, `%${q.search}%`),
  ));

  const all = conditions.length
    ? await db.select().from(paymentsTable).where(and(...conditions)).orderBy(desc(paymentsTable.createdAt))
    : await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));

  const { data, total, page, limit, totalPages } = paginate(all, parsePagination(q));
  res.json({ data: data.map(mapPayment), total, page, limit, totalPages });
});

router.get("/payments/stats", async (_req, res) => {
  const all = await db.select({ status: paymentsTable.status, amount: paymentsTable.amount, method: paymentsTable.method }).from(paymentsTable);
  const paid = all.filter(p => p.status === "PAID");
  const total_collected = paid.reduce((s, p) => s + parseFloat(p.amount), 0);
  const byGateway: Record<string, number> = {};
  for (const p of paid) {
    byGateway[p.method] = (byGateway[p.method] ?? 0) + parseFloat(p.amount);
  }
  const by_gateway = Object.entries(byGateway).map(([gateway, amount]) => ({
    gateway,
    amount,
    percentage: total_collected > 0 ? Math.round((amount / total_collected) * 100) : 0,
  }));
  res.json({
    total_collected,
    matched: paid.length,
    unmatched: all.filter(p => p.status === "PENDING").length,
    failed_count: all.filter(p => p.status === "FAILED").length,
    by_gateway,
    doctor_pending_payouts: 0,
  });
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const pay = await db.select().from(paymentsTable).where(eq(paymentsTable.id, req.params.id)).limit(1);
  if (!pay.length) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(mapPayment(pay[0]));
});

export default router;
