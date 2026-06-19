import { randomUUID } from "node:crypto";
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { doctorsTable } from "./doctors";
import { patientsTable } from "./patients";
import { consultationSessionsTable } from "./consultations";

export const prescriptionsTable = pgTable("prescriptions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  doctorId: text("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => consultationSessionsTable.id, { onDelete: "set null" }),
  diagnosis: text("diagnosis"),
  medicines: jsonb("medicines").notNull().default([]),
  followUpDate: text("follow_up_date"),
  notes: text("notes"),
  doctorName: text("doctor_name"),
  patientName: text("patient_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Prescription = typeof prescriptionsTable.$inferSelect;
