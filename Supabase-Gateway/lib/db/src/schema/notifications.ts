import { randomUUID } from "node:crypto";
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationChannelEnum = pgEnum("notification_channel", [
  "IN_APP",
  "SMS",
  "EMAIL",
  "PUSH",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "PENDING",
  "SENT",
  "FAILED",
  "READ",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "APPOINTMENT",
  "VERIFICATION",
  "PAYMENT",
  "PAYOUT",
  "SUPPORT",
  "REVIEW",
  "SYSTEM",
]);

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull().default("SYSTEM"),
  channel: notificationChannelEnum("channel").notNull().default("IN_APP"),
  status: notificationStatusEnum("status").notNull().default("PENDING"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export const selectNotificationSchema = createSelectSchema(notificationsTable);

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
