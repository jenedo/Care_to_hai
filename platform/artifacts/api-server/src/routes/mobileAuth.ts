import { Router } from "express";
import { createClerkClient, verifyToken as verifyClerkJwt } from "@clerk/express";
import { appwriteDatabases, ID, Query } from "../lib/appwrite";
import { fail } from "../lib/errors";

const router = Router();
const DB_ID = process.env.APPWRITE_DATABASE_ID ?? "asaancare";
const USERS_COLLECTION = "users";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
});

function getBearerToken(req: { headers: { authorization?: string } }): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
}

router.post("/auth/mobile/send-otp", async (_req, res): Promise<void> => {
  res.json({ success: true, data: { message: "Use Clerk for authentication" } });
});

router.post("/auth/mobile/verify-otp", async (_req, res): Promise<void> => {
  res.json({ success: true, data: { message: "Use Clerk for authentication" } });
});

router.post("/auth/mobile/email-login", async (_req, res): Promise<void> => {
  res.json({ success: true, data: { message: "Use Clerk for authentication" } });
});

router.post("/auth/mobile/refresh", async (_req, res): Promise<void> => {
  res.json({ success: true, data: { message: "Use Clerk for authentication" } });
});

router.post("/auth/mobile/logout", async (_req, res): Promise<void> => {
  res.json({ success: true, data: { message: "Logged out" } });
});

router.post("/auth/mobile/sync-user", async (req, res): Promise<void> => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json(fail("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const payload = await verifyClerkJwt(token, {
      secretKey: process.env.CLERK_SECRET_KEY ?? "",
    });
    if (!payload?.sub) {
      res.status(401).json(fail("INVALID_TOKEN", "Invalid or expired token"));
      return;
    }

    const clerkUser = await clerkClient.users.getUser(payload.sub);
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      res.status(400).json(fail("VALIDATION_ERROR", "Clerk user must have an email"));
      return;
    }

    const clerkId = clerkUser.id;
    const fullName =
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
      email.split("@")[0];
    const phone = clerkUser.phoneNumbers[0]?.phoneNumber ?? "";

    // Never trust role from the client — verify Clerk token first, then default to patient.
    const assignedRole = "patient";

    const existing = await appwriteDatabases.listDocuments(DB_ID, USERS_COLLECTION, [
      Query.equal("clerkId", clerkId),
    ]);

    if (existing.total > 0) {
      res.json({ success: true, data: existing.documents[0] });
      return;
    }

    const user = await appwriteDatabases.createDocument(DB_ID, USERS_COLLECTION, ID.unique(), {
      clerkId,
      email,
      fullName,
      phone,
      role: assignedRole,
    });

    res.json({ success: true, data: user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json(fail("INTERNAL_ERROR", message));
  }
});

export default router;
