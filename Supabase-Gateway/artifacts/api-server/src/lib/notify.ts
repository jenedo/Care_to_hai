import { db, notificationsTable } from "./db";

export interface NotifyParams {
  userId: string;
  title: string;
  message: string;
  type?: "APPOINTMENT" | "VERIFICATION" | "PAYMENT" | "PAYOUT" | "SUPPORT" | "REVIEW" | "SYSTEM";
  entityType?: string;
  entityId?: string;
}

export async function createNotification(params: NotifyParams): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type ?? "SYSTEM",
      channel: "IN_APP",
      status: "PENDING",
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
    });
  } catch (err) {
    console.error("Failed to create notification", err);
  }
}

export async function notifyAdmins(title: string, message: string, type: NotifyParams["type"], entityType?: string, entityId?: string): Promise<void> {
  await createNotification({ userId: "admin", title, message, type, entityType, entityId });
}
