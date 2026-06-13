import { randomUUID } from "node:crypto";
import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { doctorsTable } from "./doctors";

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
]);

export const consultationTypeEnum = pgEnum("consultation_type", ["ONLINE", "CLINIC", "BOTH"]);

export const doctorAvailabilityTable = pgTable("doctor_availability", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  doctorId: text("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(30),
  consultationType: consultationTypeEnum("consultation_type").notNull().default("ONLINE"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDoctorAvailabilitySchema = createInsertSchema(doctorAvailabilityTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectDoctorAvailabilitySchema = createSelectSchema(doctorAvailabilityTable);

export type InsertDoctorAvailability = z.infer<typeof insertDoctorAvailabilitySchema>;
export type DoctorAvailability = typeof doctorAvailabilityTable.$inferSelect;
