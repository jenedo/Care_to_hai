import { randomUUID } from "node:crypto";
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const ticketCategoryEnum = pgEnum("ticket_category", [
  "TECHNICAL",
  "BILLING",
  "APPOINTMENT",
  "VERIFICATION",
  "GENERAL",
  "OTHER",
]);

export const supportTicketsTable = pgTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id"),
  userName: text("user_name"),
  userEmail: text("user_email"),
  userRole: text("user_role"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: ticketCategoryEnum("category").notNull().default("GENERAL"),
  priority: ticketPriorityEnum("priority").notNull().default("MEDIUM"),
  status: ticketStatusEnum("status").notNull().default("OPEN"),
  assignedToAdminId: text("assigned_to_admin_id"),
  assignedToAdminName: text("assigned_to_admin_name"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketRepliesTable = pgTable("ticket_replies", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  ticketId: text("ticket_id").notNull().references(() => supportTicketsTable.id, { onDelete: "cascade" }),
  authorId: text("author_id"),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(),
  message: text("message").notNull(),
  isInternal: text("is_internal").default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTicketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectSupportTicketSchema = createSelectSchema(supportTicketsTable);
export const insertTicketReplySchema = createInsertSchema(ticketRepliesTable).omit({ id: true, createdAt: true });
export const selectTicketReplySchema = createSelectSchema(ticketRepliesTable);

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
export type TicketReply = typeof ticketRepliesTable.$inferSelect;
