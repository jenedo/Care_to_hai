import { Router } from "express";
import { eq, and, desc, count } from "drizzle-orm";
import { db, notificationsTable } from "../lib/db";
import { requireAuth } from "../middlewares/auth";
import { paginate, parsePagination } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

router.get("/notifications", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const userId = req.admin!.userId;
  const conds: any[] = [eq(notificationsTable.userId, userId)];
  if (q.status && q.status !== "all") conds.push(eq(notificationsTable.status, q.status as any));
  if (q.type) conds.push(eq(notificationsTable.type, q.type as any));
  const all = await db.select().from(notificationsTable).where(and(...conds)).orderBy(desc(notificationsTable.createdAt));
  const adminNotifs = await db.select().from(notificationsTable)
    .where(and(eq(notificationsTable.userId, "admin"), ...conds.slice(1)))
    .orderBy(desc(notificationsTable.createdAt));
  const combined = [...all, ...adminNotifs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const result = paginate(combined, parsePagination(q));
  res.json(result);
});

router.get("/notifications/unread-count", async (req, res) => {
  const userId = req.admin!.userId;
  const userCount = await db.select({ n: count() }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.status, "PENDING")));
  const adminCount = await db.select({ n: count() }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, "admin"), eq(notificationsTable.status, "PENDING")));
  res.json({ count: (userCount[0]?.n ?? 0) + (adminCount[0]?.n ?? 0) });
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const notif = await db.select().from(notificationsTable).where(eq(notificationsTable.id, req.params.id)).limit(1);
  if (!notif.length) { res.status(404).json({ error: "Notification not found" }); return; }
  await db.update(notificationsTable).set({ status: "READ", readAt: new Date() }).where(eq(notificationsTable.id, req.params.id));
  const updated = await db.select().from(notificationsTable).where(eq(notificationsTable.id, req.params.id)).limit(1);
  res.json(updated[0]);
});

router.post("/notifications/mark-all-read", async (req, res) => {
  const userId = req.admin!.userId;
  await db.update(notificationsTable).set({ status: "READ", readAt: new Date() })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.status, "PENDING")));
  await db.update(notificationsTable).set({ status: "READ", readAt: new Date() })
    .where(and(eq(notificationsTable.userId, "admin"), eq(notificationsTable.status, "PENDING")));
  res.json({ success: true });
});

export default router;
