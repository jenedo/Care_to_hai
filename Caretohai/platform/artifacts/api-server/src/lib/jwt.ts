import jwt, {
  type JwtPayload,
  type Secret,
  type SignOptions,
} from "jsonwebtoken";

export const AUTH_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "FINANCE",
  "VERIFICATION_OFFICER",
  "DOCTOR",
  "CLINIC_ADMIN",
  "CLINIC_STAFF",
  "PATIENT",
] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export interface JWTPayload {
  userId: string;
  role: AuthRole;

  adminId?: string;
  doctorId?: string;
  patientId?: string;

  email?: string;
  fullName?: string;

  tokenVersion?: number;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production");
  }

  if (JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
}

const secret: Secret = JWT_SECRET ?? "local-dev-only-secret-change-me-32chars";

const JWT_ISSUER = process.env.JWT_ISSUER ?? "asaancare-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "asaancare-client";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "12h") as SignOptions["expiresIn"];

const signOptions: SignOptions = {
  expiresIn: JWT_EXPIRES_IN,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithm: "HS256",
};

export function signToken(payload: JWTPayload): string {
  if (!payload.userId || typeof payload.userId !== "string") {
    throw new Error("JWT payload userId is required");
  }

  if (!isValidRole(payload.role)) {
    throw new Error("Invalid JWT role");
  }

  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      adminId: payload.adminId,
      doctorId: payload.doctorId,
      patientId: payload.patientId,
      email: payload.email,
      fullName: payload.fullName,
      tokenVersion: payload.tokenVersion,
    },
    secret,
    signOptions,
  );
}

export function signAdminToken(params: {
  userId: string;
  adminId?: string;
  email?: string;
  fullName?: string;
  tokenVersion?: number;
  isCreator?: boolean;
}): string {
  return signToken({
    userId: params.userId,
    adminId: params.adminId,
    email: params.email,
    fullName: params.fullName,
    tokenVersion: params.tokenVersion,
    role: params.isCreator ? "SUPER_ADMIN" : "ADMIN",
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const decoded = jwt.verify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });

    if (!isJwtPayload(decoded)) {
      return null;
    }

    const userId = getString(decoded.userId);
    const role = decoded.role;

    if (!userId || !isValidRole(role)) {
      return null;
    }

    return {
      userId,
      role,
      adminId: getString(decoded.adminId),
      doctorId: getString(decoded.doctorId),
      patientId: getString(decoded.patientId),
      email: getString(decoded.email),
      fullName: getString(decoded.fullName),
      tokenVersion: getNumber(decoded.tokenVersion),
    };
  } catch {
    return null;
  }
}

export function isValidRole(role: unknown): role is AuthRole {
  return AUTH_ROLES.includes(role as AuthRole);
}

function isJwtPayload(value: string | JwtPayload): value is JwtPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
