import { db, notificationsTable } from "./db";
import { logger } from "./logger";

export const NOTIFICATION_TYPES = [
  "APPOINTMENT",
  "VERIFICATION",
  "PAYMENT",
  "PAYOUT",
  "SUPPORT",
  "REVIEW",
  "SYSTEM",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotifyParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  entityType?: string;
  entityId?: string;
}

function cleanText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function parseAdminUserIds(): string[] {
  return (process.env.ADMIN_NOTIFICATION_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function createNotification(params: NotifyParams): Promise<void> {
  const userId = params.userId.trim();
  const title = cleanText(params.title, 160);
  const message = cleanText(params.message, 1000);

  if (!userId) {
    logger.warn("Notification not created: userId is required");
    return;
  }

  if (!title) {
    logger.warn({ userId }, "Notification not created: title is required");
    return;
  }

  if (!message) {
    logger.warn({ userId }, "Notification not created: message is required");
    return;
  }

  try {
    await db.insert(notificationsTable).values({
      userId,
      title,
      message,
      type: params.type ?? "SYSTEM",
      channel: "IN_APP",
      status: "PENDING",
      entityType: params.entityType?.trim() || null,
      entityId: params.entityId?.trim() || null,
    });
  } catch (err) {
    logger.error(
      { err, userId, type: params.type ?? "SYSTEM" },
      "Failed to create notification",
    );
  }
}

export async function createNotificationsForUsers(
  userIds: string[],
  params: Omit<NotifyParams, "userId">,
): Promise<void> {
  const uniqueUserIds = [
    ...new Set(userIds.map((id) => id.trim()).filter(Boolean)),
  ];

  if (uniqueUserIds.length === 0) {
    logger.warn("Notifications not created: no userIds provided");
    return;
  }

  await Promise.all(
    uniqueUserIds.map((userId) =>
      createNotification({
        userId,
        title: params.title,
        message: params.message,
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
      }),
    ),
  );
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType = "SYSTEM",
  entityType?: string,
  entityId?: string,
): Promise<void> {
  const adminUserIds = parseAdminUserIds();

  if (adminUserIds.length === 0) {
    logger.warn("Admins not notified: ADMIN_NOTIFICATION_USER_IDS env is missing");
    return;
  }

  await createNotificationsForUsers(adminUserIds, {
    title,
    message,
    type,
    entityType,
    entityId,
  });
}
