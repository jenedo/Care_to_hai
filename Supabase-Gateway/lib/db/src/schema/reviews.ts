import { randomUUID } from "node:crypto";
import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appointmentsTable } from "./appointments";
import { doctorsTable } from "./doctors";

export const reviewStatusEnum = pgEnum("review_status", [
  "PENDING",
  "PUBLISHED",
  "HIDDEN",
  "REPORTED",
]);

export const reviewsTable = pgTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  appointmentId: text("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  patientId: text("patient_id"),
  patientName: text("patient_name"),
  doctorId: text("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }),
  doctorName: text("doctor_name"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  status: reviewStatusEnum("status").notNull().default("PENDING"),
  reportReason: text("report_reason"),
  moderatedByAdminId: text("moderated_by_admin_id"),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectReviewSchema = createSelectSchema(reviewsTable);

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
