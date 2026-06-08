import { randomUUID } from "node:crypto";
import { pgTable, text, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { doctorsTable } from "./doctors";

export const clinicStatusEnum = pgEnum("clinic_status", ["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const clinicsTable = pgTable("clinics", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  area: text("area"),
  status: clinicStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const doctorClinicsTable = pgTable("doctor_clinics", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  doctorId: text("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  clinicId: text("clinic_id").notNull().references(() => clinicsTable.id, { onDelete: "cascade" }),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClinicSchema = createInsertSchema(clinicsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectClinicSchema = createSelectSchema(clinicsTable);
export const insertDoctorClinicSchema = createInsertSchema(doctorClinicsTable).omit({ id: true, createdAt: true });
export const selectDoctorClinicSchema = createSelectSchema(doctorClinicsTable);

export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinicsTable.$inferSelect;
export type InsertDoctorClinic = z.infer<typeof insertDoctorClinicSchema>;
export type DoctorClinic = typeof doctorClinicsTable.$inferSelect;
