import { Router } from "express";
import { and, count, desc, eq, or, type SQL } from "drizzle-orm";
import { db, notificationsTable } from "../lib/db";
import { NotFoundError, ValidationError } from "../lib/errors";
import { requireAuth } from "../middlewares/auth";
import { parsePagination } from "../lib/pagination";

const router = Router();

const ADMIN_BROADCAST_USER_ID = "admin";

const NOTIFICATION_STATUSES = ["PENDING", "SENT", "FAILED", "READ"] as const;
const NOTIFICATION_TYPES = [
  "APPOINTMENT",
  "VERIFICATION",
  "PAYMENT",
  "PAYOUT",
  "SUPPORT",
  "REVIEW",
  "SYSTEM",
] as const;

type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
type NotificationType = (typeof NOTIFICATION_TYPES)[number];

router.use(requireAuth);

function readQueryValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseStatusFilter(value: unknown): NotificationStatus | undefined {
  const status = readQueryValue(value);

  if (!status || status === "all") {
    return undefined;
  }

  if ((NOTIFICATION_STATUSES as readonly string[]).includes(status)) {
    return status as NotificationStatus;
  }

  throw new ValidationError("Invalid notification status filter", {
    allowed: ["all", ...NOTIFICATION_STATUSES],
  });
}

function parseTypeFilter(value: unknown): NotificationType | undefined {
  const type = readQueryValue(value);

  if (!type) {
    return undefined;
  }

  if ((NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return type as NotificationType;
  }

  throw new ValidationError("Invalid notification type filter", {
    allowed: NOTIFICATION_TYPES,
  });
}

function recipientCondition(userId: string): SQL {
  return or(
    eq(notificationsTable.userId, userId),
    eq(notificationsTable.userId, ADMIN_BROADCAST_USER_ID),
  )!;
}

function buildNotificationWhere(
  userId: string,
  status?: NotificationStatus,
  type?: NotificationType,
): SQL {
  const conditions: SQL[] = [recipientCondition(userId)];

  if (status) {
    conditions.push(eq(notificationsTable.status, status));
  }

  if (type) {
    conditions.push(eq(notificationsTable.type, type));
  }

  return and(...conditions)!;
}

router.get("/notifications", async (req, res): Promise<void> => {
  const userId = req.admin!.userId;
  const status = parseStatusFilter(req.query.status);
  const type = parseTypeFilter(req.query.type);

  const page = readQueryValue(req.query.page) ?? "1";
  const limit = readQueryValue(req.query.limit) ?? "10";
  const pagination = parsePagination({ page, limit });

  const where = buildNotificationWhere(userId, status, type);
  const offset = (pagination.page - 1) * pagination.limit;

  const totalRows = await db
    .select({ n: count() })
    .from(notificationsTable)
    .where(where);

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(where)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(pagination.limit)
    .offset(offset);

  const total = totalRows[0]?.n ?? 0;

  res.json({
    data: rows,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  });
});

router.get("/notifications/unread-count", async (req, res): Promise<void> => {
  const userId = req.admin!.userId;

  const rows = await db
    .select({ n: count() })
    .from(notificationsTable)
    .where(
      and(
        recipientCondition(userId),
        eq(notificationsTable.status, "PENDING"),
      ),
    );

  res.json({ count: rows[0]?.n ?? 0 });
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const userId = req.admin!.userId;
  const notificationId = req.params.id?.trim();

  if (!notificationId) {
    throw new ValidationError("Notification id is required");
  }

  const existing = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        recipientCondition(userId),
      ),
    )
    .limit(1);

  if (!existing.length) {
    throw new NotFoundError("Notification");
  }

  await db
    .update(notificationsTable)
    .set({ status: "READ", readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        recipientCondition(userId),
      ),
    );

  const updated = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.id, notificationId))
    .limit(1);

  res.json(updated[0]);
});

router.post("/notifications/mark-all-read", async (req, res): Promise<void> => {
  const userId = req.admin!.userId;

  await db
    .update(notificationsTable)
    .set({ status: "READ", readAt: new Date() })
    .where(
      and(
        recipientCondition(userId),
        eq(notificationsTable.status, "PENDING"),
      ),
    );

  res.json({ success: true });
});

export default router;
