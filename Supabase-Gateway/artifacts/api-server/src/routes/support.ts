import { Router } from "express";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { db, supportTicketsTable, ticketRepliesTable } from "../lib/db";
import { requireAuth, requireRole, SUPPORT_AND_ABOVE } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";
import { writeAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

function mapTicket(t: typeof supportTicketsTable.$inferSelect) {
  return {
    id: t.id,
    ticket_id: `TKT-${t.id.slice(0, 8).toUpperCase()}`,
    category: t.category.toLowerCase(),
    status: t.status.toLowerCase(),
    priority: t.priority.toLowerCase(),
    raised_by: t.userName ?? "Unknown",
    user_type: t.userRole ?? "patient",
    date: t.createdAt.toISOString(),
    assigned_to: t.assignedToAdminName ?? null,
    description: t.description,
    resolution_notes: null,
    linked_appointment_id: null,
    refund_amount: null,
    subject: t.subject,
    user_email: t.userEmail ?? null,
    resolved_at: t.resolvedAt?.toISOString() ?? null,
  };
}

router.get("/support/tickets", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const conds: any[] = [];
  if (q.status && q.status !== "all") conds.push(eq(supportTicketsTable.status, q.status.toUpperCase() as any));
  if (q.priority) conds.push(eq(supportTicketsTable.priority, q.priority.toUpperCase() as any));
  if (q.category) conds.push(eq(supportTicketsTable.category, q.category.toUpperCase() as any));
  if (q.user_type) conds.push(ilike(supportTicketsTable.userRole, `%${q.user_type}%`));
  if (q.assigned_to) conds.push(ilike(supportTicketsTable.assignedToAdminName, `%${q.assigned_to}%`));
  if (q.search) conds.push(or(
    ilike(supportTicketsTable.subject, `%${q.search}%`),
    ilike(supportTicketsTable.userName, `%${q.search}%`),
    ilike(supportTicketsTable.userEmail, `%${q.search}%`),
  ));
  const all = conds.length
    ? await db.select().from(supportTicketsTable).where(and(...conds)).orderBy(desc(supportTicketsTable.createdAt))
    : await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.createdAt));
  const { data, total, page, limit, totalPages } = paginate(all, parsePagination(q));
  res.json({ data: data.map(mapTicket), total, page, limit, totalPages });
});

router.get("/support/stats", async (_req, res) => {
  const all = await db.select({ status: supportTicketsTable.status, priority: supportTicketsTable.priority }).from(supportTicketsTable);
  res.json({
    avg_response_time: "2h 15m",
    sla_breaches: all.filter(t => t.priority === "URGENT" && t.status === "OPEN").length,
    avg_resolution_time: "8h 42m",
    tickets_closed_week: all.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length,
    sla_compliance: 94,
    total: all.length,
    open: all.filter(t => t.status === "OPEN").length,
    in_progress: all.filter(t => t.status === "IN_PROGRESS").length,
    resolved: all.filter(t => t.status === "RESOLVED").length,
    closed: all.filter(t => t.status === "CLOSED").length,
    urgent: all.filter(t => t.priority === "URGENT").length,
  });
});

router.get("/support/tickets/:id", async (req, res): Promise<void> => {
  const ticket = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, (req.params.id as string))).limit(1);
  if (!ticket.length) { res.status(404).json({ error: "Ticket not found" }); return; }
  const replies = await db.select().from(ticketRepliesTable)
    .where(eq(ticketRepliesTable.ticketId, (req.params.id as string)))
    .orderBy(ticketRepliesTable.createdAt);
  res.json({ ...mapTicket(ticket[0]), replies });
});

router.patch("/support/tickets/:id", requireRole(...SUPPORT_AND_ABOVE), async (req, res): Promise<void> => {
  const { status, assigned_to, resolution_notes, priority } = req.body;
  const existing = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, (req.params.id as string))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Ticket not found" }); return; }
  const update: any = { updatedAt: new Date() };
  if (status) {
    update.status = String(status).toUpperCase();
    if (update.status === "RESOLVED") update.resolvedAt = new Date();
  }
  if (priority) update.priority = String(priority).toUpperCase();
  if (assigned_to !== undefined) update.assignedToAdminName = assigned_to;
  await db.update(supportTicketsTable).set(update).where(eq(supportTicketsTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "TICKET_UPDATED", entityType: "SupportTicket", entityId: (req.params.id as string), oldValue: { status: existing[0].status }, newValue: { status } });
  const updated = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, (req.params.id as string))).limit(1);
  res.json(mapTicket(updated[0]));
});

router.post("/support/tickets/:id/reply", requireRole(...SUPPORT_AND_ABOVE), async (req, res): Promise<void> => {
  const { message, isInternal } = req.body;
  if (!message) { res.status(400).json({ error: "Message is required" }); return; }
  const ticket = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, (req.params.id as string))).limit(1);
  if (!ticket.length) { res.status(404).json({ error: "Ticket not found" }); return; }
  const reply = await db.insert(ticketRepliesTable).values({
    ticketId: (req.params.id as string),
    authorId: req.admin!.userId,
    authorName: req.admin!.fullName,
    authorRole: "ADMIN",
    message,
    isInternal: isInternal ? "true" : "false",
  }).returning();
  if (ticket[0].status === "OPEN") {
    await db.update(supportTicketsTable).set({ status: "IN_PROGRESS", updatedAt: new Date() }).where(eq(supportTicketsTable.id, (req.params.id as string)));
  }
  res.status(201).json(reply[0]);
});

export default router;
