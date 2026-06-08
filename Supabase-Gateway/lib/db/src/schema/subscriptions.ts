import { randomUUID } from "node:crypto";
import { pgTable, text, numeric, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "TRIAL",
]);

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  features: jsonb("features").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patientSubscriptionsTable = pgTable("patient_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  patientId: text("patient_id").references(() => patientsTable.id, { onDelete: "set null" }),
  patientName: text("patient_name").notNull(),
  planId: text("plan_id").references(() => subscriptionPlansTable.id, { onDelete: "set null" }),
  planName: text("plan_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectSubscriptionPlanSchema = createSelectSchema(subscriptionPlansTable);
export const insertPatientSubscriptionSchema = createInsertSchema(patientSubscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectPatientSubscriptionSchema = createSelectSchema(patientSubscriptionsTable);

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type PatientSubscription = typeof patientSubscriptionsTable.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type InsertPatientSubscription = z.infer<typeof insertPatientSubscriptionSchema>;
