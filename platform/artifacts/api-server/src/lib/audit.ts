import { db, auditLogsTable } from "./db";
import type { Request } from "express";

export interface AuditParams {
  req?: Request;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  notes?: string | null;
}

function getClientIp(req?: Request): string | null {
  if (!req) return null;

  const forwardedFor = req.headers["x-forwarded-for"];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(",")[0]?.trim() || null;
  }

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return req.ip || req.socket?.remoteAddress || null;
}

function getUserAgent(req?: Request): string | null {
  const userAgent = req?.headers["user-agent"];

  if (Array.isArray(userAgent)) {
    return userAgent[0] ?? null;
  }

  return userAgent ?? null;
}

function sanitizeAuditValue(value: unknown): unknown {
  if (value === undefined) return null;

  if (!value || typeof value !== "object") {
    return value;
  }

  const sensitiveKeys = new Set([
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "otp",
    "cnic",
    "cardNumber",
    "cvv",
  ]);

  if (Array.isArray(value)) {
    return value.map(sanitizeAuditValue);
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(value)) {
    if (sensitiveKeys.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeAuditValue(fieldValue);
    }
  }

  return sanitized;
}

export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      actorRole: params.actorRole ?? null,

      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,

      oldValue: sanitizeAuditValue(params.oldValue) as any,
      newValue: sanitizeAuditValue(params.newValue) as any,

      ipAddress: getClientIp(params.req),
      userAgent: getUserAgent(params.req),

      notes: params.notes ?? null,
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}










// import { db, auditLogsTable } from "./db";
// import type { Request } from "express";

// export interface AuditParams {
//   req?: Request;
//   actorId?: string | null;
//   actorName?: string | null;
//   actorRole?: string | null;
//   action: string;
//   entityType: string;
//   entityId?: string | null;
//   oldValue?: unknown;
//   newValue?: unknown;
//   notes?: string | null;
// }

// export async function writeAudit(params: AuditParams): Promise<void> {
//   try {
//     await db.insert(auditLogsTable).values({
//       actorId: params.actorId ?? null,
//       actorName: params.actorName ?? null,
//       actorRole: params.actorRole ?? null,
//       action: params.action,
//       entityType: params.entityType,
//       entityId: params.entityId ?? null,
//       oldValue: params.oldValue ? (params.oldValue as any) : null,
//       newValue: params.newValue ? (params.newValue as any) : null,
//       ipAddress: (() => {
//         if (!params.req) return null;
//         const fwd = params.req.headers["x-forwarded-for"];
//         if (Array.isArray(fwd)) return fwd[0] ?? null;
//         return fwd ?? params.req.socket?.remoteAddress ?? null;
//       })(),
//       userAgent: (() => {
//         const ua = params.req?.headers["user-agent"];
//         return Array.isArray(ua) ? ua[0] ?? null : ua ?? null;
//       })(),
//       notes: params.notes ?? null,
//     });
//   } catch (err) {
//     console.error("Failed to write audit log", err);
//   }
// }
