import { type NextFunction, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { adminUsersTable, db, doctorsTable, patientsTable, usersTable } from "../lib/db";
import { fail } from "../lib/errors";
import { verifyToken, type JWTPayload } from "../lib/jwt";
import { ADMIN_COOKIE, DOCTOR_COOKIE, PATIENT_COOKIE } from "../lib/cookies";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  FINANCE: "FINANCE",
  SUPPORT: "SUPPORT",
  VERIFICATION_OFFICER: "VERIFICATION_OFFICER",
} as const;

export const ALL_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.FINANCE,
  ROLES.SUPPORT,
  ROLES.VERIFICATION_OFFICER,
] as const;

export const FINANCE_AND_ABOVE = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FINANCE] as const;
export const SUPPORT_AND_ABOVE = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPPORT] as const;
export const VERIFIER_AND_ABOVE = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.VERIFICATION_OFFICER,
] as const;

export type AdminRole = (typeof ALL_ROLES)[number];

export type AuthenticatedAdmin = JWTPayload & {
  role: AdminRole;
  adminId: string;
};

export type AuthenticatedDoctor = JWTPayload & {
  role: "DOCTOR";
  doctorId: string;
};

export type AuthenticatedPatient = JWTPayload & {
  role: "PATIENT";
  patientId: string;
};

declare global {
  namespace Express {
  interface Request {
  auth?: AuthenticatedAdmin | AuthenticatedDoctor | AuthenticatedPatient;

  admin?: AuthenticatedAdmin;

  doctor?: AuthenticatedDoctor;
  doctorAuth?: AuthenticatedDoctor;

  patient?: AuthenticatedPatient;
  patientAuth?: AuthenticatedPatient;
}
  }
}

function sendAuthError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json(fail(code, message));
}

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
}

function getToken(req: Request, cookieName: string): string | undefined {
  const cookieToken = req.cookies?.[cookieName];

  if (typeof cookieToken === "string" && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }

  return getBearerToken(req);
}

function isAdminRole(role: string): role is AdminRole {
  return (ALL_ROLES as readonly string[]).includes(role);
}

async function getActiveUserById(userId: string) {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const user = rows[0];

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getToken(req, ADMIN_COOKIE);

    if (!token) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const payload = verifyToken(token);

    if (!payload || !isAdminRole(payload.role)) {
      sendAuthError(res, 401, "INVALID_TOKEN", "Invalid or expired token");
      return;
    }

    const user = await getActiveUserById(payload.userId);

    if (!user || user.role !== "ADMIN") {
      sendAuthError(res, 401, "ACCOUNT_INACTIVE", "Admin account is not active");
      return;
    }

    const adminRows = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.userId, user.id))
      .limit(1);

    const adminRecord = adminRows[0];

    if (!adminRecord || !adminRecord.isActive) {
      sendAuthError(res, 401, "ACCOUNT_INACTIVE", "Admin account is not active");
      return;
    }

    const adminAuth: AuthenticatedAdmin = {
      ...payload,
      userId: user.id,
      adminId: adminRecord.id,
      email: user.email,
      fullName: user.fullName,
      role: adminRecord.role,
    };

    req.auth = adminAuth;
    req.admin = adminAuth;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: readonly AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    if (!roles.includes(req.admin.role)) {
      sendAuthError(res, 403, "FORBIDDEN", `Role ${req.admin.role} is not permitted for this action`);
      return;
    }

    next();
  };
}

export async function requireDoctorAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getToken(req, DOCTOR_COOKIE);

    if (!token) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Doctor authentication required");
      return;
    }

    const payload = verifyToken(token);

    if (!payload || payload.role !== "DOCTOR") {
      sendAuthError(res, 401, "INVALID_TOKEN", "Invalid or expired doctor token");
      return;
    }

    const user = await getActiveUserById(payload.userId);

    if (!user || user.role !== "DOCTOR") {
      sendAuthError(res, 401, "ACCOUNT_INACTIVE", "Doctor account is not active");
      return;
    }

    const doctorRows = await db
      .select()
      .from(doctorsTable)
      .where(eq(doctorsTable.userId, user.id))
      .limit(1);

    const doctor = doctorRows[0];

    if (!doctor || doctor.verificationStatus === "SUSPENDED") {
      sendAuthError(res, 401, "ACCOUNT_INACTIVE", "Doctor account is not active");
      return;
    }

    const doctorAuth: AuthenticatedDoctor = {
      ...payload,
      userId: user.id,
      adminId: "",
      email: user.email,
      fullName: user.fullName,
      role: "DOCTOR",
      doctorId: doctor.id,
    };

    req.auth = doctorAuth;
    req.doctor = doctorAuth;
    req.doctorAuth = doctorAuth;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Accepts ANY valid token: admin, doctor, or patient.
 * Tries ADMIN_COOKIE first, then DOCTOR_COOKIE, then PATIENT_COOKIE.
 */
export async function requireAnyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Try admin
  const adminToken = getToken(req, ADMIN_COOKIE);
  if (adminToken) {
    const payload = verifyToken(adminToken);
    if (payload && isAdminRole(payload.role)) {
      try {
        const user = await getActiveUserById(payload.userId);
        if (user && user.role === "ADMIN") {
          const adminRows = await db.select().from(adminUsersTable).where(eq(adminUsersTable.userId, user.id)).limit(1);
          const adminRecord = adminRows[0];
          if (adminRecord?.isActive) {
            const auth: AuthenticatedAdmin = {
              ...payload, userId: user.id, adminId: adminRecord.id, email: user.email,
              fullName: user.fullName, role: adminRecord.role,
            };
            req.auth = auth; req.admin = auth;
            return next();
          }
        }
      } catch (err) { return next(err); }
    }
  }

  // Try doctor
  const doctorToken = getToken(req, DOCTOR_COOKIE);
  if (doctorToken) {
    const payload = verifyToken(doctorToken);
    if (payload && payload.role === "DOCTOR") {
      try {
        const user = await getActiveUserById(payload.userId);
        if (user && user.role === "DOCTOR") {
          const doctorRows = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, user.id)).limit(1);
          const doctor = doctorRows[0];
          if (doctor && doctor.verificationStatus !== "SUSPENDED") {
            const auth: AuthenticatedDoctor = {
              ...payload, userId: user.id, adminId: "", email: user.email,
              fullName: user.fullName, role: "DOCTOR", doctorId: doctor.id,
            };
            req.auth = auth; req.doctor = auth; req.doctorAuth = auth;
            return next();
          }
        }
      } catch (err) { return next(err); }
    }
  }

  // Try patient
  const patientToken = getToken(req, PATIENT_COOKIE);
  if (patientToken) {
    const payload = verifyToken(patientToken);
    if (payload && payload.role === "PATIENT") {
      try {
        const user = await getActiveUserById(payload.userId);
        if (user && user.role === "PATIENT") {
          const patientRows = await db.select().from(patientsTable).where(eq(patientsTable.userId, user.id)).limit(1);
          const patient = patientRows[0];
          if (patient && patient.status === "ACTIVE") {
            const auth: AuthenticatedPatient = {
              ...payload, userId: user.id, adminId: "", email: user.email,
              fullName: user.fullName, role: "PATIENT", patientId: patient.id,
            };
            req.auth = auth; req.patient = auth; req.patientAuth = auth;
            return next();
          }
        }
      } catch (err) { return next(err); }
    }
  }

  sendAuthError(res, 401, "UNAUTHORIZED", "Authentication required");
}

/**
 * Accepts a doctor OR patient token. Sets req.auth, req.doctorAuth/req.patientAuth.
 * Useful for session endpoints accessible by both roles.
 */
export async function requireDoctorOrPatientAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Try doctor cookie/Bearer first
  const doctorToken = getToken(req, DOCTOR_COOKIE);
  if (doctorToken) {
    const payload = verifyToken(doctorToken);
    if (payload && payload.role === "DOCTOR") {
      try {
        const user = await getActiveUserById(payload.userId);
        if (user && user.role === "DOCTOR") {
          const doctorRows = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, user.id)).limit(1);
          const doctor = doctorRows[0];
          if (doctor && doctor.verificationStatus !== "SUSPENDED") {
            const auth: AuthenticatedDoctor = {
              ...payload, userId: user.id, adminId: "", email: user.email,
              fullName: user.fullName, role: "DOCTOR", doctorId: doctor.id,
            };
            req.auth = auth; req.doctor = auth; req.doctorAuth = auth;
            return next();
          }
        }
      } catch (err) { return next(err); }
    }
  }

  // Try patient cookie/Bearer
  const patientToken = getToken(req, PATIENT_COOKIE);
  if (patientToken) {
    const payload = verifyToken(patientToken);
    if (payload && payload.role === "PATIENT") {
      try {
        const user = await getActiveUserById(payload.userId);
        if (user && user.role === "PATIENT") {
          const patientRows = await db.select().from(patientsTable).where(eq(patientsTable.userId, user.id)).limit(1);
          const patient = patientRows[0];
          if (patient && patient.status === "ACTIVE") {
            const auth: AuthenticatedPatient = {
              ...payload, userId: user.id, adminId: "", email: user.email,
              fullName: user.fullName, role: "PATIENT", patientId: patient.id,
            };
            req.auth = auth; req.patient = auth; req.patientAuth = auth;
            return next();
          }
        }
      } catch (err) { return next(err); }
    }
  }

  sendAuthError(res, 401, "UNAUTHORIZED", "Doctor or patient authentication required");
}

export async function requirePatientAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getToken(req, PATIENT_COOKIE);

    if (!token) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Patient authentication required");
      return;
    }

    const payload = verifyToken(token);

    if (!payload || payload.role !== "PATIENT") {
      sendAuthError(res, 401, "INVALID_TOKEN", "Invalid or expired patient token");
      return;
    }

    const user = await getActiveUserById(payload.userId);

    if (!user || user.role !== "PATIENT") {
      sendAuthError(res, 401, "ACCOUNT_INACTIVE", "Patient account is not active");
      return;
    }

    const patientRows = await db
      .select()
      .from(patientsTable)
      .where(eq(patientsTable.userId, user.id))
      .limit(1);

    const patient = patientRows[0];

    if (!patient || patient.status !== "ACTIVE") {
      sendAuthError(res, 401, "ACCOUNT_INACTIVE", "Patient account is not active");
      return;
    }

    const patientAuth: AuthenticatedPatient = {
      ...payload,
      userId: user.id,
      adminId: "",
      email: user.email,
      fullName: user.fullName,
      role: "PATIENT",
      patientId: patient.id,
    };

    req.auth = patientAuth;
    req.patient = patientAuth;
    req.patientAuth = patientAuth;

    next();
  } catch (err) {
    next(err);
  }
}
