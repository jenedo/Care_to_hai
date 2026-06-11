import { Router } from "express";
import { eq, and, desc, ilike, count, gte, lte, type SQL } from "drizzle-orm";
import { auditLogsTable, db } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { parsePagination } from "../lib/pagination";

const router = Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN", "ADMIN"));

function getQueryString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseDateFilter(value: unknown): Date | null {
  const raw = getQueryString(value);

  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPaginationQuery(query: Record<string, unknown>): Record<string, string> {
  const paginationQuery: Record<string, string> = {};

  const page = getQueryString(query.page);
  const limit = getQueryString(query.limit);

  if (page) {
    paginationQuery.page = page;
  }

  if (limit) {
    paginationQuery.limit = limit;
  }

  return paginationQuery;
}

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
  const conditions: SQL<unknown>[] = [];

  const actorId = getQueryString(req.query.user_id) ?? getQueryString(req.query.actor_id);
  const entityType = getQueryString(req.query.entity_type);
  const actionType = getQueryString(req.query.action_type);
  const dateFromRaw = getQueryString(req.query.date_from);
  const dateToRaw = getQueryString(req.query.date_to);
  const dateFrom = parseDateFilter(req.query.date_from);
  const dateTo = parseDateFilter(req.query.date_to);

  if (actorId) {
    conditions.push(eq(auditLogsTable.actorId, actorId));
  }

  if (entityType) {
    conditions.push(ilike(auditLogsTable.entityType, `%${entityType}%`));
  }

  if (actionType) {
    conditions.push(ilike(auditLogsTable.action, `%${actionType}%`));
  }

  if (dateFromRaw && !dateFrom) {
    res.status(400).json({ error: "Invalid date_from" });
    return;
  }

  if (dateToRaw && !dateTo) {
    res.status(400).json({ error: "Invalid date_to" });
    return;
  }

  if (dateFrom) {
    conditions.push(gte(auditLogsTable.createdAt, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(auditLogsTable.createdAt, dateTo));
  }

  const { page, limit } = parsePagination(getPaginationQuery(req.query as Record<string, unknown>));
  const offset = (page - 1) * limit;
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    whereClause
      ? db
          .select()
          .from(auditLogsTable)
          .where(whereClause)
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(auditLogsTable)
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(limit)
          .offset(offset),

    whereClause
      ? db.select({ n: count() }).from(auditLogsTable).where(whereClause)
      : db.select({ n: count() }).from(auditLogsTable),
  ]);

  const total = Number(totalRows[0]?.n ?? 0);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  res.json({
    data: rows.map(mapAuditLog),
    total,
    page,
    limit,
    totalPages,
  });
});

router.get("/audit/stats", async (_req, res): Promise<void> => {
  const since24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalCount, recentCount, activeActors, actorCounts] = await Promise.all([
    db.select({ n: count() }).from(auditLogsTable),

    db
      .select({ n: count() })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, since24Hours)),

    db
      .select({ actorId: auditLogsTable.actorId })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, since24Hours))
      .groupBy(auditLogsTable.actorId),

    db
      .select({
        actorName: auditLogsTable.actorName,
        n: count(),
      })
      .from(auditLogsTable)
      .groupBy(auditLogsTable.actorName)
      .orderBy(desc(count()))
      .limit(5),
  ]);

  res.json({
    active_admins: activeActors.length,
    active_admins_change: 0,

    suspicious_events: 0,
    suspicious_events_change: 0,

    locked_accounts: 0,
    locked_accounts_change: 0,

    recent_compliance_actions: Number(recentCount[0]?.n ?? 0),
    recent_compliance_actions_change: 0,

    total_logs: Number(totalCount[0]?.n ?? 0),
    top_actors: actorCounts,
  });
});

export default router;