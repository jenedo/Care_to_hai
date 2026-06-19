import { randomUUID } from "node:crypto";
import { pgTable, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appointmentsTable } from "./appointments";
import { doctorsTable } from "./doctors";

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "SAFEPLAY",
  "JAZZCASH",
  "EASYPAISA",
  "CARD",
  "BANK",
  "RAAST",
]);

export const paymentTxStatusEnum = pgEnum("payment_tx_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PROCESSED",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "PENDING",
  "APPROVED",
  "PAID",
  "REJECTED",
]);

export const paymentsTable = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  appointmentId: text("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  patientId: text("patient_id"),
  patientName: text("patient_name"),
  doctorId: text("doctor_id").references(() => doctorsTable.id, { onDelete: "set null" }),
  doctorName: text("doctor_name"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  status: paymentTxStatusEnum("status").notNull().default("PENDING"),
  transactionRef: text("transaction_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refundsTable = pgTable("refunds", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  paymentId: text("payment_id").references(() => paymentsTable.id, { onDelete: "set null" }),
  appointmentId: text("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: refundStatusEnum("status").notNull().default("REQUESTED"),
  requestedBy: text("requested_by"),
  requestedByName: text("requested_by_name"),
  reviewedByAdminId: text("reviewed_by_admin_id"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const doctorPayoutsTable = pgTable("doctor_payouts", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  doctorId: text("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  doctorName: text("doctor_name"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: payoutStatusEnum("status").notNull().default("PENDING"),
  bankName: text("bank_name"),
  accountTitle: text("account_title"),
  accountNumber: text("account_number"),
  iban: text("iban"),
  walletProvider: text("wallet_provider"),
  walletNumber: text("wallet_number"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processedByAdminId: text("processed_by_admin_id"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectPaymentSchema = createSelectSchema(paymentsTable);
export const insertRefundSchema = createInsertSchema(refundsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectRefundSchema = createSelectSchema(refundsTable);
export const insertDoctorPayoutSchema = createInsertSchema(doctorPayoutsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectDoctorPayoutSchema = createSelectSchema(doctorPayoutsTable);

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refundsTable.$inferSelect;
export type InsertDoctorPayout = z.infer<typeof insertDoctorPayoutSchema>;
export type DoctorPayout = typeof doctorPayoutsTable.$inferSelect;
