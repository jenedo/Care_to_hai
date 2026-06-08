import { randomUUID } from "node:crypto";
import { pgTable, text, integer, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const verificationStatusEnum = pgEnum("verification_status", [
  "INCOMPLETE",
  "PENDING",
  "IN_REVIEW",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
]);

export const profileStatusEnum = pgEnum("profile_status", ["INCOMPLETE", "COMPLETE"]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER"]);

export const doctorsTable = pgTable("doctors", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  email: text("email").notNull(),
  gender: genderEnum("gender"),
  specialty: text("specialty").notNull(),
  qualifications: text("qualifications").array().notNull().default([]),
  experienceYears: integer("experience_years"),
  bio: text("bio"),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }),
  city: text("city"),
  area: text("area"),
  pmdcNumber: text("pmdc_number"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("INCOMPLETE"),
  profileStatus: profileStatusEnum("profile_status").notNull().default("INCOMPLETE"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  totalReviews: integer("total_reviews").notNull().default(0),
  appointmentsCompleted: integer("appointments_completed").notNull().default(0),
  noShows: integer("no_shows").notNull().default(0),
  isAvailableOnline: boolean("is_available_online").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const doctorVerificationsTable = pgTable("doctor_verifications", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  doctorId: text("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  pmdcNumber: text("pmdc_number"),
  cnicFrontUrl: text("cnic_front_url"),
  cnicBackUrl: text("cnic_back_url"),
  degreeUrl: text("degree_url"),
  certificateUrl: text("certificate_url").array().notNull().default([]),
  status: verificationStatusEnum("status").notNull().default("PENDING"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedByAdminId: text("reviewed_by_admin_id"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectDoctorSchema = createSelectSchema(doctorsTable);
export const insertDoctorVerificationSchema = createInsertSchema(doctorVerificationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectDoctorVerificationSchema = createSelectSchema(doctorVerificationsTable);

export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctorsTable.$inferSelect;
export type InsertDoctorVerification = z.infer<typeof insertDoctorVerificationSchema>;
export type DoctorVerification = typeof doctorVerificationsTable.$inferSelect;
