import { Router } from "express";
import { eq, sql, count, and, gte, lt } from "drizzle-orm";
import { db, subscriptionPlansTable, patientSubscriptionsTable } from "../lib/db";
import { requireAuth } from "../middlewares/auth";
import { parsePagination } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

// GET /subscriptions/plans
router.get("/subscriptions/plans", async (_req, res, next) => {
  try {
    const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.isActive, true));

    // Attach live subscriber count to each plan
    const withCounts = await Promise.all(
      plans.map(async (plan) => {
        const [row] = await db
          .select({ count: count() })
          .from(patientSubscriptionsTable)
          .where(
            and(
              eq(patientSubscriptionsTable.planId, plan.id),
              eq(patientSubscriptionsTable.status, "ACTIVE"),
            ),
          );
        return { ...plan, active_subscribers: Number(row?.count ?? 0) };
      }),
    );

    res.json(withCounts);
  } catch (err) {
    next(err);
  }
});

// GET /subscriptions/stats
router.get("/subscriptions/stats", async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // MRR = sum of active subscription amounts
    const [mrrRow] = await db
      .select({ mrr: sql<string>`COALESCE(SUM(${patientSubscriptionsTable.amount}), 0)` })
      .from(patientSubscriptionsTable)
      .where(eq(patientSubscriptionsTable.status, "ACTIVE"));

    // Active subscribers count
    const [activeRow] = await db
      .select({ count: count() })
      .from(patientSubscriptionsTable)
      .where(eq(patientSubscriptionsTable.status, "ACTIVE"));

    // Renewals this month = subscriptions whose end_date falls in the current month
    const [renewalsRow] = await db
      .select({ count: count() })
      .from(patientSubscriptionsTable)
      .where(
        and(
          gte(patientSubscriptionsTable.endDate, startOfMonth),
          lt(patientSubscriptionsTable.endDate, endOfMonth),
        ),
      );

    // Cancelled this month for churn rate
    const [cancelledRow] = await db
      .select({ count: count() })
      .from(patientSubscriptionsTable)
      .where(eq(patientSubscriptionsTable.status, "CANCELLED"));

    const totalActive = Number(activeRow?.count ?? 0);
    const totalCancelled = Number(cancelledRow?.count ?? 0);
    const total = totalActive + totalCancelled;
    const churnRate = total > 0 ? ((totalCancelled / total) * 100).toFixed(2) : "0.00";

    // Plan distribution
    const planDist = await db
      .select({
        plan: patientSubscriptionsTable.planName,
        count: count(),
      })
      .from(patientSubscriptionsTable)
      .where(eq(patientSubscriptionsTable.status, "ACTIVE"))
      .groupBy(patientSubscriptionsTable.planName);

    const planDistWithPct = planDist.map((p) => ({
      plan: p.plan,
      count: Number(p.count),
      percentage: totalActive > 0 ? ((Number(p.count) / totalActive) * 100).toFixed(1) : "0",
    }));

    res.json({
      mrr: Number(mrrRow?.mrr ?? 0),
      active_subscribers: totalActive,
      churn_rate: parseFloat(churnRate),
      renewals_this_month: Number(renewalsRow?.count ?? 0),
      plan_distribution: planDistWithPct,
    });
  } catch (err) {
    next(err);
  }
});

// GET /subscriptions  (paginated subscriber list)
router.get("/subscriptions", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const search = (req.query.search as string | undefined) ?? "";
    const status = (req.query.status as string | undefined) ?? "";

    const conditions = [];
    if (status) conditions.push(eq(patientSubscriptionsTable.status, status as any));
    if (search) {
      conditions.push(
        sql`(${patientSubscriptionsTable.patientName} ILIKE ${"%" + search + "%"} OR ${patientSubscriptionsTable.planName} ILIKE ${"%" + search + "%"})`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ count: count() })
      .from(patientSubscriptionsTable)
      .where(where);

    const total = Number(totalRow?.count ?? 0);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: patientSubscriptionsTable.id,
        patientId: patientSubscriptionsTable.patientId,
        patient_name: patientSubscriptionsTable.patientName,
        plan: patientSubscriptionsTable.planName,
        amount: patientSubscriptionsTable.amount,
        status: patientSubscriptionsTable.status,
        start_date: patientSubscriptionsTable.startDate,
        end_date: patientSubscriptionsTable.endDate,
      })
      .from(patientSubscriptionsTable)
      .where(where)
      .orderBy(sql`${patientSubscriptionsTable.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const now = new Date();
    const data = rows.map((r) => ({
      ...r,
      amount: parseFloat(r.amount),
      days_until_renewal:
        r.status === "ACTIVE" && r.end_date
          ? Math.max(0, Math.ceil((new Date(r.end_date).getTime() - now.getTime()) / 86400000))
          : null,
    }));

    res.json({ data, total, page, limit, totalPages });
  } catch (err) {
    next(err);
  }
});

export default router;
