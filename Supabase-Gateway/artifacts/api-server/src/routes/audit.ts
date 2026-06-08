import { Router } from "express";
import { eq, and, desc, ilike, count, gte, lte } from "drizzle-orm";
import { db, auditLogsTable } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

function mapAuditLog(l: typeof auditLogsTable.$inferSelect) {
  return {
    id: l.id,
    admin_user: l.actorName ?? "System",
    action_type: l.action,
    entity_type: l.entityType,
    entity_id: l.entityId ?? null,
    entity_name: l.entityType,
    timestamp: l.createdAt.toISOString(),
    ip_address: l.ipAddress ?? "—",
    actor_role: l.actorRole ?? null,
    notes: l.notes ?? null,
  };
}

router.get("/audit/logs", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const conds: any[] = [];
  if (q.user_id) conds.push(eq(auditLogsTable.actorId, q.user_id));
  if (q.entity_type) conds.push(ilike(auditLogsTable.entityType, `%${q.entity_type}%`));
  if (q.action_type) conds.push(ilike(auditLogsTable.action, `%${q.action_type}%`));
  if (q.date_from) conds.push(gte(auditLogsTable.createdAt, new Date(q.date_from)));
  if (q.date_to) conds.push(lte(auditLogsTable.createdAt, new Date(q.date_to)));
  const all = conds.length
    ? await db.select().from(auditLogsTable).where(and(...conds)).orderBy(desc(auditLogsTable.createdAt))
    : await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt));
  const { data, total, page, limit, totalPages } = paginate(all, parsePagination(q));
  res.json({ data: data.map(mapAuditLog), total, page, limit, totalPages });
});

router.get("/audit/stats", async (_req, res) => {
  const [totalCount, actorCounts] = await Promise.all([
    db.select({ n: count() }).from(auditLogsTable),
    db.select({ actorName: auditLogsTable.actorName, n: count() })
      .from(auditLogsTable).groupBy(auditLogsTable.actorName).orderBy(desc(count())).limit(5),
  ]);
  res.json({
    active_admins: actorCounts.length,
    active_admins_change: 0,
    suspicious_events: 0,
    suspicious_events_change: 0,
    locked_accounts: 0,
    locked_accounts_change: 0,
    recent_compliance_actions: totalCount[0]?.n ?? 0,
    recent_compliance_actions_change: 0,
    total_logs: totalCount[0]?.n ?? 0,
    top_actors: actorCounts,
  });
});

export default router;
