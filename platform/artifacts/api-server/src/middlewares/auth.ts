import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { createClerkClient, verifyToken as verifyClerkJwt } from "@clerk/express";
import { fail } from "../lib/errors";
import {
  resolveAdminIdentity,
  resolveDoctorIdentity,
  resolvePatientIdentity,
} from "../lib/clerkIdentity";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
});

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

export type AuthenticatedAdmin = {
  userId: string;
  adminId: string;
  email: string;
  fullName: string;
  role: AdminRole;
};

export type AuthenticatedDoctor = {
  userId: string;
  adminId: string;
  email: string;
  fullName: string;
  role: "DOCTOR";
  doctorId: string;
};

export type AuthenticatedPatient = {
  userId: string;
  adminId: string;
  email: string;
  fullName: string;
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
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? process.env.CLERK_SECRET_KEY ?? "local-dev-only-secret-change-me-32chars";
}

function isAdminRole(role: string | undefined): role is AdminRole {
  if (!role) return false;
  return (ALL_ROLES as readonly string[]).includes(role);
}

async function verifyClerkToken(token: string) {
  try {
    const tokenPayload = await verifyClerkJwt(token, {
      secretKey: process.env.CLERK_SECRET_KEY ?? "",
    });
    return tokenPayload;
  } catch {
    return null;
  }
}

async function getClerkUser(userId: string) {
  try {
    return await clerkClient.users.getUser(userId);
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getBearerToken(req) ?? (req.cookies?.["__session"] as string | undefined);

    if (!token) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret()) as {
        userId?: string;
        adminId?: string;
        email?: string;
        fullName?: string;
        role?: string;
      };
      if (decoded && decoded.userId && decoded.role) {
        const adminAuth = {
          userId: decoded.userId,
          adminId: decoded.adminId ?? decoded.userId,
          email: decoded.email ?? "",
          fullName: decoded.fullName ?? "",
          role: decoded.role as AdminRole,
        };
        req.auth = adminAuth;
        req.admin = adminAuth;
        return next();
      }
    } catch {
      // not a JWT token, try Clerk below
    }

    const payload = await verifyClerkToken(token);
    if (!payload) {
      sendAuthError(res, 401, "INVALID_TOKEN", "Invalid or expired token");
      return;
    }

    const clerkUser = await getClerkUser(payload.sub);
    if (!clerkUser) {
      sendAuthError(res, 401, "ACCOUNT_NOT_FOUND", "User not found");
      return;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

    // Admin access is granted only from Neon DB records — never from Clerk publicMetadata alone.
    const adminAuth = await resolveAdminIdentity(clerkUser.id, email);
    if (!adminAuth) {
      sendAuthError(res, 403, "FORBIDDEN", "Admin access required");
      return;
    }

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
    const token = getBearerToken(req);

    if (!token) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Doctor authentication required");
      return;
    }

    const payload = await verifyClerkToken(token);
    if (!payload) {
      sendAuthError(res, 401, "INVALID_TOKEN", "Invalid or expired doctor token");
      return;
    }

    const clerkUser = await getClerkUser(payload.sub);
    if (!clerkUser) {
      sendAuthError(res, 401, "ACCOUNT_NOT_FOUND", "Doctor not found");
      return;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const doctorAuth = await resolveDoctorIdentity(clerkUser.id, email);
    if (!doctorAuth) {
      sendAuthError(res, 403, "FORBIDDEN", "Doctor access required");
      return;
    }

    req.auth = doctorAuth;
    req.doctor = doctorAuth;
    req.doctorAuth = doctorAuth;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requirePatientAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getBearerToken(req);

    if (!token) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Patient authentication required");
      return;
    }

    const payload = await verifyClerkToken(token);
    if (!payload) {
      sendAuthError(res, 401, "INVALID_TOKEN", "Invalid or expired patient token");
      return;
    }

    const clerkUser = await getClerkUser(payload.sub);
    if (!clerkUser) {
      sendAuthError(res, 401, "ACCOUNT_NOT_FOUND", "Patient not found");
      return;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const patientAuth = await resolvePatientIdentity(clerkUser.id, email);
    if (!patientAuth) {
      sendAuthError(res, 403, "FORBIDDEN", "Patient access required");
      return;
    }

    req.auth = patientAuth;
    req.patient = patientAuth;
    req.patientAuth = patientAuth;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAnyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getBearerToken(req) ?? (req.cookies?.["__session"] as string | undefined);

    if (!token) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const payload = await verifyClerkToken(token);
    if (!payload) {
      sendAuthError(res, 401, "INVALID_TOKEN", "Invalid or expired token");
      return;
    }

    const clerkUser = await getClerkUser(payload.sub);
    if (!clerkUser) {
      sendAuthError(res, 401, "ACCOUNT_NOT_FOUND", "User not found");
      return;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

    // Admin access is granted only from Neon DB records — never from Clerk publicMetadata alone.
    const adminAuth = await resolveAdminIdentity(clerkUser.id, email);
    if (adminAuth) {
      req.auth = adminAuth;
      req.admin = adminAuth;
      return next();
    }

    const doctorAuth = await resolveDoctorIdentity(clerkUser.id, email);
    if (doctorAuth) {
      req.auth = doctorAuth;
      req.doctor = doctorAuth;
      req.doctorAuth = doctorAuth;
      return next();
    }

    const patientAuth = await resolvePatientIdentity(clerkUser.id, email);
    if (patientAuth) {
      req.auth = patientAuth;
      req.patient = patientAuth;
      req.patientAuth = patientAuth;
      return next();
    }

    sendAuthError(res, 403, "FORBIDDEN", "Unrecognized role");
  } catch (err) {
    next(err);
  }
}

export async function requireDoctorOrPatientAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getBearerToken(req);

    if (!token) {
      sendAuthError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const payload = await verifyClerkToken(token);
    if (!payload) {
      sendAuthError(res, 401, "INVALID_TOKEN", "Invalid or expired token");
      return;
    }

    const clerkUser = await getClerkUser(payload.sub);
    if (!clerkUser) {
      sendAuthError(res, 401, "ACCOUNT_NOT_FOUND", "User not found");
      return;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

    const doctorAuth = await resolveDoctorIdentity(clerkUser.id, email);
    if (doctorAuth) {
      req.auth = doctorAuth;
      req.doctor = doctorAuth;
      req.doctorAuth = doctorAuth;
      return next();
    }

    const patientAuth = await resolvePatientIdentity(clerkUser.id, email);
    if (patientAuth) {
      req.auth = patientAuth;
      req.patient = patientAuth;
      req.patientAuth = patientAuth;
      return next();
    }

    sendAuthError(res, 401, "UNAUTHORIZED", "Doctor or patient authentication required");
  } catch (err) {
    next(err);
  }
}
