import { type Request, type Response, Router } from "express";
import { createClerkClient, verifyToken as verifyClerkJwt } from "@clerk/express";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, doctorsTable } from "../lib/db";
import { mapAdminDoctor, mapPublicDoctor } from "../lib/doctorMapper";
import { resolveAdminIdentity } from "../lib/clerkIdentity";
import { requireAuth } from "../middlewares/auth";
import { parsePagination } from "../lib/pagination";

const router = Router();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
});

const VERIFICATION_STATUSES = [
  "INCOMPLETE",
  "PENDING",
  "IN_REVIEW",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
] as const;

type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

function getQueryString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getRouteParam(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeUpper(value: unknown): string | undefined {
  return getQueryString(value)?.toUpperCase();
}

function isVerificationStatus(value: unknown): value is VerificationStatus {
  return typeof value === "string" && (VERIFICATION_STATUSES as readonly string[]).includes(value);
}

function getPaginationQuery(query: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  const page = getQueryString(query.page);
  const limit = getQueryString(query.limit);
  if (page) result.page = page;
  if (limit) result.limit = limit;
  return result;
}

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
}

async function tryResolveAdmin(req: Request): Promise<boolean> {
  const token = getBearerToken(req) ?? (req.cookies?.["__session"] as string | undefined);
  if (!token) return false;

  try {
    const payload = await verifyClerkJwt(token, {
      secretKey: process.env.CLERK_SECRET_KEY ?? "",
    });
    if (!payload) return false;

    const clerkUser = await clerkClient.users.getUser(payload.sub);
    if (!clerkUser) return false;

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const adminAuth = await resolveAdminIdentity(clerkUser.id, email);
    if (!adminAuth) return false;

    req.auth = adminAuth;
    req.admin = adminAuth;
    return true;
  } catch {
    return false;
  }
}

function buildDoctorConditions(
  req: Request,
  isAdmin: boolean,
): { conditions: SQL<unknown>[]; invalidStatus?: string } {
  const conditions: SQL<unknown>[] = [];
  const status = normalizeUpper(req.query.status);
  const specialty = getQueryString(req.query.specialty);
  const city = getQueryString(req.query.city);
  const search = getQueryString(req.query.search);

  if (isAdmin) {
    if (status && status !== "ALL") {
      if (!isVerificationStatus(status)) {
        return { conditions, invalidStatus: status };
      }
      conditions.push(eq(doctorsTable.verificationStatus, status));
    }
  } else {
    conditions.push(eq(doctorsTable.verificationStatus, "VERIFIED"));
  }

  if (specialty) {
    conditions.push(ilike(doctorsTable.specialty, `%${specialty}%`));
  }

  if (city) {
    conditions.push(ilike(doctorsTable.city, `%${city}%`));
  }

  if (search) {
    const searchCondition = or(
      ilike(doctorsTable.fullName, `%${search}%`),
      ilike(doctorsTable.specialty, `%${search}%`),
      ilike(doctorsTable.city, `%${search}%`),
      ...(isAdmin
        ? [
            ilike(doctorsTable.pmdcNumber, `%${search}%`),
            ilike(doctorsTable.email, `%${search}%`),
            ilike(doctorsTable.phone, `%${search}%`),
          ]
        : []),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return { conditions };
}

router.get("/doctors/stats", requireAuth, async (_req, res): Promise<void> => {
  const [total, verified, pending, inReview, suspended, rejected] = await Promise.all([
    db.select({ n: count() }).from(doctorsTable),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "VERIFIED")),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "PENDING")),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "IN_REVIEW")),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "SUSPENDED")),
    db.select({ n: count() }).from(doctorsTable).where(eq(doctorsTable.verificationStatus, "REJECTED")),
  ]);

  res.json({
    total: Number(total[0]?.n ?? 0),
    verified: Number(verified[0]?.n ?? 0),
    pending: Number(pending[0]?.n ?? 0) + Number(inReview[0]?.n ?? 0),
    suspended: Number(suspended[0]?.n ?? 0),
    rejected: Number(rejected[0]?.n ?? 0),
  });
});

router.get("/doctors", async (req, res): Promise<void> => {
  const isAdmin = await tryResolveAdmin(req);
  const { conditions, invalidStatus } = buildDoctorConditions(req, isAdmin);

  if (invalidStatus) {
    res.status(400).json({ error: "Invalid doctor verification status" });
    return;
  }

  const { page, limit } = parsePagination(getPaginationQuery(req.query as Record<string, unknown>));
  const offset = (page - 1) * limit;
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    whereClause
      ? db
          .select()
          .from(doctorsTable)
          .where(whereClause)
          .orderBy(desc(doctorsTable.createdAt))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(doctorsTable)
          .orderBy(desc(doctorsTable.createdAt))
          .limit(limit)
          .offset(offset),
    whereClause
      ? db.select({ n: count() }).from(doctorsTable).where(whereClause)
      : db.select({ n: count() }).from(doctorsTable),
  ]);

  const total = Number(totalRows[0]?.n ?? 0);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  const mapper = isAdmin ? mapAdminDoctor : mapPublicDoctor;

  res.json({
    data: rows.map(mapper),
    total,
    page,
    limit,
    totalPages,
  });
});

router.get("/doctors/:id", async (req, res): Promise<void> => {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Doctor id is required" });
    return;
  }

  const isAdmin = await tryResolveAdmin(req);
  const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id)).limit(1);

  if (!doctor.length) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  if (!isAdmin && doctor[0].verificationStatus !== "VERIFIED") {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  res.json(isAdmin ? mapAdminDoctor(doctor[0]) : mapPublicDoctor(doctor[0]));
});

export default router;
