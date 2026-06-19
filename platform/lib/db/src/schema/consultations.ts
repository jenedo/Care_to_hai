import { randomUUID } from "node:crypto";
import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { doctorsTable } from "./doctors";
import { patientsTable } from "./patients";

export const consultationSessionsTable = pgTable("consultation_sessions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  patientId: text("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }),
  doctorId: text("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("CHAT"),
  status: text("status").notNull().default("WAITING"),
  isFreeTrial: boolean("is_free_trial").notNull().default(false),
  isPaid: boolean("is_paid").notNull().default(false),
  paymentAmount: numeric("payment_amount", { precision: 10, scale: 2 }).default("0"),
  perSessionFee: numeric("per_session_fee", { precision: 10, scale: 2 }).default("75"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  freeSecondsLimit: integer("free_seconds_limit").notNull().default(120),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionMessagesTable = pgTable("session_messages", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => consultationSessionsTable.id, { onDelete: "cascade" }),
  senderRole: text("sender_role").notNull(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name"),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("TEXT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const freeTrialRecordsTable = pgTable("free_trial_records", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  patientId: text("patient_id")
    .notNull()
    .references(() => patientsTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => consultationSessionsTable.id, {
    onDelete: "set null",
  }),
  deviceFingerprint: text("device_fingerprint"),
  ipAddress: text("ip_address"),
  weekStart: text("week_start").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cardVerificationsTable = pgTable("card_verifications", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  patientId: text("patient_id")
    .notNull()
    .references(() => patientsTable.id, { onDelete: "cascade" }),
  last4: text("last4"),
  cardBrand: text("card_brand"),
  cardFingerprint: text("card_fingerprint"),
  isVerified: boolean("is_verified").notNull().default(false),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consultationRequestsTable = pgTable("consultation_requests", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  patientId: text("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  doctorId: text("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("CHAT"),
  message: text("message"),
  status: text("status").notNull().default("PENDING"),
  preferredTime: timestamp("preferred_time", { withTimezone: true }),
  sessionId: text("session_id").references(() => consultationSessionsTable.id, { onDelete: "set null" }),
  declinedReason: text("declined_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ConsultationSession = typeof consultationSessionsTable.$inferSelect;
export type SessionMessage = typeof sessionMessagesTable.$inferSelect;
export type FreeTrialRecord = typeof freeTrialRecordsTable.$inferSelect;
export type CardVerification = typeof cardVerificationsTable.$inferSelect;
export type ConsultationRequest = typeof consultationRequestsTable.$inferSelect;
