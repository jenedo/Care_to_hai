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

export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      actorRole: params.actorRole ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      oldValue: params.oldValue ? (params.oldValue as any) : null,
      newValue: params.newValue ? (params.newValue as any) : null,
      ipAddress: (() => {
        if (!params.req) return null;
        const fwd = params.req.headers["x-forwarded-for"];
        if (Array.isArray(fwd)) return fwd[0] ?? null;
        return fwd ?? params.req.socket?.remoteAddress ?? null;
      })(),
      userAgent: (() => {
        const ua = params.req?.headers["user-agent"];
        return Array.isArray(ua) ? ua[0] ?? null : ua ?? null;
      })(),
      notes: params.notes ?? null,
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}
