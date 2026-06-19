import { eq, or } from "drizzle-orm";
import {
  adminUsersTable,
  db,
  doctorsTable,
  patientsTable,
  usersTable,
} from "./db";
import type { AdminRole } from "../middlewares/auth";

export async function linkClerkId(userId: string, clerkUserId: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ clerkUserId: clerkUserId, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

export async function findUserByClerk(clerkUserId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      or(
        eq(usersTable.clerkUserId, clerkUserId),
        eq(usersTable.email, normalizedEmail),
      ),
    )
    .limit(1);

  if (user && !user.clerkUserId) {
    await linkClerkId(user.id, clerkUserId);
  }

  return user ?? null;
}

export async function resolveAdminIdentity(clerkUserId: string, email: string) {
  const user = await findUserByClerk(clerkUserId, email);
  if (!user || user.status !== "ACTIVE" || user.role !== "ADMIN") {
    return null;
  }

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.userId, user.id))
    .limit(1);

  if (!admin || !admin.isActive) {
    return null;
  }

  return {
    userId: clerkUserId,
    adminId: admin.id,
    email: user.email,
    fullName: user.fullName,
    role: admin.role as AdminRole,
  };
}

export async function resolveDoctorIdentity(clerkUserId: string, email: string) {
  const user = await findUserByClerk(clerkUserId, email);
  if (!user || user.status !== "ACTIVE" || user.role !== "DOCTOR") {
    return null;
  }

  const [doctor] = await db
    .select()
    .from(doctorsTable)
    .where(eq(doctorsTable.userId, user.id))
    .limit(1);

  if (!doctor) {
    return null;
  }

  return {
    userId: clerkUserId,
    adminId: "",
    email: user.email,
    fullName: doctor.fullName,
    role: "DOCTOR" as const,
    doctorId: doctor.id,
  };
}

export async function resolvePatientIdentity(clerkUserId: string, email: string) {
  const user = await findUserByClerk(clerkUserId, email);
  if (!user || user.status !== "ACTIVE" || user.role !== "PATIENT") {
    return null;
  }

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.userId, user.id))
    .limit(1);

  if (!patient) {
    return null;
  }

  return {
    userId: clerkUserId,
    adminId: "",
    email: user.email,
    fullName: patient.fullName,
    role: "PATIENT" as const,
    patientId: patient.id,
  };
}
