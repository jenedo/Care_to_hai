import { randomUUID } from "node:crypto";
import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { userStatusEnum } from "./users";

export const bloodGroupEnum = pgEnum("blood_group", [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
]);

export const patientsTable = pgTable("patients", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  bloodGroup: bloodGroupEnum("blood_group"),
  city: text("city"),
  area: text("area"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  totalAppointments: integer("total_appointments").notNull().default(0),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectPatientSchema = createSelectSchema(patientsTable);

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
