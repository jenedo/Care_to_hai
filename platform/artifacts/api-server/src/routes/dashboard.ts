import { Router } from "express";
import { eq, desc, sql, and, gte, count } from "drizzle-orm";
import { db, doctorsTable, patientsTable, appointmentsTable, paymentsTable, supportTicketsTable, auditLogsTable, doctorVerificationsTable } from "../lib/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/dashboard/stats", async (_req, res) => {
  const [doctorStats, patientCount, todayAppts, revenue, tickets, pendingVerif] = await Promise.all([
    db.select({ status: doctorsTable.verificationStatus }).from(doctorsTable),
    db.select({ n: count() }).from(patientsTable),
    db.select({ n: count() }).from(appointmentsTable).where(
      gte(appointmentsTable.appointmentDate, new Date(new Date().setHours(0, 0, 0, 0)))
    ),
    db.select({ amount: paymentsTable.amount }).from(paymentsTable).where(eq(paymentsTable.status, "PAID")),
    db.select({ n: count() }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "OPEN")),
    db.select({ n: count() }).from(doctorsTable).where(
      sql`${doctorsTable.verificationStatus} IN ('PENDING', 'IN_REVIEW')`
    ),
  ]);

  const monthlyRevenue = revenue.reduce((s, p) => s + parseFloat(p.amount ?? "0"), 0);
  const verifiedDoctors = doctorStats.filter(d => d.status === "VERIFIED").length;

  res.json({
    total_users: (patientCount[0]?.n ?? 0) + doctorStats.length,
    total_users_change: 0,
    verified_doctors: verifiedDoctors,
    verified_doctors_change: 0,
    todays_appointments: todayAppts[0]?.n ?? 0,
    todays_appointments_change: 0,
    monthly_revenue: monthlyRevenue,
    monthly_revenue_change: 0,
    open_tickets: tickets[0]?.n ?? 0,
    pending_approvals: pendingVerif[0]?.n ?? 0,
  });
});

router.get("/dashboard/activity", async (_req, res) => {
  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(10);
  res.json(logs.map(l => ({
    id: l.id,
    user: l.actorName ?? "System",
    action: l.action,
    entity: l.entityType,
    timestamp: l.createdAt,
  })));
});

router.get("/dashboard/revenue-trend", async (_req, res) => {
  const payments = await db.select({ amount: paymentsTable.amount, createdAt: paymentsTable.createdAt })
    .from(paymentsTable).where(eq(paymentsTable.status, "PAID"))
    .orderBy(paymentsTable.createdAt);

  const byDay: Record<string, number> = {};
  for (const p of payments) {
    const d = new Date(p.createdAt);
    const key = `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
    byDay[key] = (byDay[key] ?? 0) + parseFloat(p.amount ?? "0");
  }

  res.json(Object.entries(byDay).slice(-14).map(([date, revenue]) => ({ date, revenue })));
});

router.get("/dashboard/verification-queue", async (_req, res) => {
  const queue = await db.select().from(doctorsTable)
    .where(sql`${doctorsTable.verificationStatus} IN ('PENDING', 'IN_REVIEW')`)
    .orderBy(doctorsTable.createdAt).limit(10);
  res.json(queue.map(d => ({
    id: d.id,
    name: d.fullName,
    specialty: d.specialty,
    city: d.city,
    status: d.verificationStatus.toLowerCase(),
    avatar_url: d.avatarUrl,
    joined_time_ago: timeAgo(d.createdAt),
  })));
});

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default router;
