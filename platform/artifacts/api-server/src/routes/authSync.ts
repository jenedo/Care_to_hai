import { Router, type Request, type Response } from "express";
import { createClerkClient, verifyToken as verifyClerkJwt } from "@clerk/express";
import { fail } from "../lib/errors";
import { ensurePatientForClerk } from "../lib/clerkSync";

const router = Router();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
});

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
}

/** After Clerk sign-up/sign-in, mobile clients call this to create the DB patient row. */
router.post("/auth/sync-me", async (req: Request, res: Response): Promise<void> => {
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

    const fullName =
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
      email.split("@")[0];
    const bodyPhone =
      typeof req.body?.phone === "string" && req.body.phone.trim()
        ? req.body.phone.trim()
        : null;
    const phone = bodyPhone ?? clerkUser.phoneNumbers[0]?.phoneNumber ?? null;

    const { user, patient } = await ensurePatientForClerk({
      clerkUserId: clerkUser.id,
      email,
      fullName,
      phone,
    });

    res.json({
      success: true,
      data: {
        userId: user.id,
        patientId: patient.id,
        email: patient.email,
        fullName: patient.fullName,
        role: "PATIENT",
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "EMAIL_USED_BY_OTHER_ROLE") {
      res.status(409).json(fail("EMAIL_CONFLICT", "Email is registered with a different account type"));
      return;
    }
    const message = err instanceof Error ? err.message : "Sync failed";
    res.status(500).json(fail("INTERNAL_ERROR", message));
  }
});

export default router;
