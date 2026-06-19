import { eq } from "drizzle-orm";
import { db, doctorsTable, patientsTable, usersTable } from "./db";
import { findUserByClerk, linkClerkId } from "./clerkIdentity";

export type ClerkProfile = {
  clerkUserId: string;
  email: string;
  fullName: string;
  phone?: string | null;
};

export async function ensurePatientForClerk(profile: ClerkProfile) {
  const email = profile.email.trim().toLowerCase();
  let user = await findUserByClerk(profile.clerkUserId, email);

  if (user && user.role !== "PATIENT") {
    throw new Error("EMAIL_USED_BY_OTHER_ROLE");
  }

  if (!user) {
    const [created] = await db
      .insert(usersTable)
      .values({
        email,
        fullName: profile.fullName.trim() || email.split("@")[0],
        phone: profile.phone ?? null,
        role: "PATIENT",
        status: "ACTIVE",
        clerkUserId: profile.clerkUserId,
      })
      .returning();
    user = created;
  } else if (!user.clerkUserId) {
    await linkClerkId(user.id, profile.clerkUserId);
  }

  const [existingPatient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.userId, user.id))
    .limit(1);

  if (existingPatient) {
    return { user, patient: existingPatient };
  }

  const [patient] = await db
    .insert(patientsTable)
    .values({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: profile.phone ?? user.phone,
      status: "ACTIVE",
    })
    .returning();

  return { user, patient };
}

export async function ensureDoctorForClerk(profile: ClerkProfile) {
  const email = profile.email.trim().toLowerCase();
  let user = await findUserByClerk(profile.clerkUserId, email);

  if (user && user.role !== "DOCTOR") {
    throw new Error("EMAIL_USED_BY_OTHER_ROLE");
  }

  if (!user) {
    throw new Error("DOCTOR_NOT_PROVISIONED");
  }

  if (!user.clerkUserId) {
    await linkClerkId(user.id, profile.clerkUserId);
  }

  const [existingDoctor] = await db
    .select()
    .from(doctorsTable)
    .where(eq(doctorsTable.userId, user.id))
    .limit(1);

  if (!existingDoctor) {
    throw new Error("DOCTOR_NOT_PROVISIONED");
  }

  return { user, doctor: existingDoctor };
}
