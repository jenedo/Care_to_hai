import { randomUUID } from "node:crypto";
import { pgTable, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { doctorsTable } from "./doctors";
import { clinicsTable } from "./clinics";
import { consultationTypeEnum } from "./availability";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "HELD",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
]);

export const paymentStatusEnum = pgEnum("appointment_payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const appointmentsTable = pgTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  patientId: text("patient_id"),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone"),
  patientAge: text("patient_age"),
  patientGender: text("patient_gender"),
  doctorId: text("doctor_id").references(() => doctorsTable.id, { onDelete: "set null" }),
  doctorName: text("doctor_name").notNull(),
  doctorSpecialty: text("doctor_specialty"),
  clinicId: text("clinic_id").references(() => clinicsTable.id, { onDelete: "set null" }),
  appointmentDate: timestamp("appointment_date", { withTimezone: true }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  consultationType: consultationTypeEnum("consultation_type").notNull().default("ONLINE"),
  status: appointmentStatusEnum("status").notNull().default("HELD"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  fee: numeric("fee", { precision: 10, scale: 2 }),
  platformCommission: numeric("platform_commission", { precision: 10, scale: 2 }),
  doctorEarning: numeric("doctor_earning", { precision: 10, scale: 2 }),
  cancellationReason: text("cancellation_reason"),
  notes: text("notes"),
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectAppointmentSchema = createSelectSchema(appointmentsTable);

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
