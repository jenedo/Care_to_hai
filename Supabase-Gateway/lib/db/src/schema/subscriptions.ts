import { randomUUID } from "node:crypto";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appointmentsTable } from "./appointments";
import { doctorsTable } from "./doctors";
import { patientsTable } from "./patients";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "TRIAL",
]);

export const planTierEnum = pgEnum("plan_tier", [
  "BASIC",
  "STANDARD",
  "PREMIUM",
]);

export const planServiceTypeEnum = pgEnum("plan_service_type", [
  "VIDEO",
  "AUDIO",
  "CHAT",
]);

export const subscriptionMemberRelationshipEnum = pgEnum("subscription_member_relationship", [
  "SELF",
  "FATHER",
  "MOTHER",
  "WIFE",
  "HUSBAND",
  "CHILD",
  "SISTER",
  "BROTHER",
  "OTHER",
]);

export const subscriptionMemberStatusEnum = pgEnum("subscription_member_status", [
  "INVITED",
  "ACTIVE",
  "REMOVED",
]);

export const subscriptionUsageStatusEnum = pgEnum("subscription_usage_status", [
  "RESERVED",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
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

export const doctorPlanParticipationTable = pgTable("doctor_plan_participation", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => doctorsTable.id, { onDelete: "cascade" }),
  planTier: planTierEnum("plan_tier").notNull(),
  serviceType: planServiceTypeEnum("service_type").notNull(),
  payoutAmount: numeric("payout_amount", { precision: 10, scale: 2 }).notNull(),
  maxDailyPlanConsults: integer("max_daily_plan_consults").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionMembersTable = pgTable("subscription_members", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  subscriptionId: text("subscription_id")
    .notNull()
    .references(() => patientSubscriptionsTable.id, { onDelete: "cascade" }),
  ownerPatientId: text("owner_patient_id")
    .notNull()
    .references(() => patientsTable.id, { onDelete: "cascade" }),
  memberPatientId: text("member_patient_id").references(() => patientsTable.id, {
    onDelete: "set null",
  }),
  relationship: subscriptionMemberRelationshipEnum("relationship").notNull(),
  status: subscriptionMemberStatusEnum("status").notNull().default("INVITED"),
  invitedPhone: text("invited_phone"),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionUsageTable = pgTable("subscription_usage", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  subscriptionId: text("subscription_id")
    .notNull()
    .references(() => patientSubscriptionsTable.id, { onDelete: "cascade" }),
  memberPatientId: text("member_patient_id")
    .notNull()
    .references(() => patientsTable.id, { onDelete: "cascade" }),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => doctorsTable.id, { onDelete: "cascade" }),
  appointmentId: text("appointment_id").references(() => appointmentsTable.id, {
    onDelete: "set null",
  }),
  serviceType: planServiceTypeEnum("service_type").notNull(),
  status: subscriptionUsageStatusEnum("status").notNull().default("RESERVED"),
  creditsUsed: integer("credits_used").notNull().default(1),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  payoutAmount: numeric("payout_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSubscriptionPlanSchema = createSelectSchema(subscriptionPlansTable);

export const insertPatientSubscriptionSchema = createInsertSchema(patientSubscriptionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectPatientSubscriptionSchema = createSelectSchema(patientSubscriptionsTable);

export const insertDoctorPlanParticipationSchema = createInsertSchema(
  doctorPlanParticipationTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectDoctorPlanParticipationSchema = createSelectSchema(
  doctorPlanParticipationTable,
);

export const insertSubscriptionMemberSchema = createInsertSchema(subscriptionMembersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSubscriptionMemberSchema = createSelectSchema(subscriptionMembersTable);

export const insertSubscriptionUsageSchema = createInsertSchema(subscriptionUsageTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSubscriptionUsageSchema = createSelectSchema(subscriptionUsageTable);

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type PatientSubscription = typeof patientSubscriptionsTable.$inferSelect;
export type DoctorPlanParticipation = typeof doctorPlanParticipationTable.$inferSelect;
export type SubscriptionMember = typeof subscriptionMembersTable.$inferSelect;
export type SubscriptionUsage = typeof subscriptionUsageTable.$inferSelect;

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type InsertPatientSubscription = z.infer<typeof insertPatientSubscriptionSchema>;
export type InsertDoctorPlanParticipation = z.infer<typeof insertDoctorPlanParticipationSchema>;
export type InsertSubscriptionMember = z.infer<typeof insertSubscriptionMemberSchema>;
export type InsertSubscriptionUsage = z.infer<typeof insertSubscriptionUsageSchema>;


