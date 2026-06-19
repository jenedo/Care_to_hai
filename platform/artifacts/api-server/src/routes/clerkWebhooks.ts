import { Router, type Request, type Response } from "express";
import { createClerkClient } from "@clerk/express";
import { ensurePatientForClerk } from "../lib/clerkSync";
import { logger } from "../lib/logger";

const router = Router();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
});

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    phone_numbers?: Array<{ phone_number: string }>;
  };
};

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn("CLERK_WEBHOOK_SECRET not set — webhook ignored");
    res.status(503).json({ error: "Webhook not configured" });
    return;
  }

  try {
    const rawBody =
      typeof req.body === "string"
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString("utf8")
          : JSON.stringify(req.body);

    const { Webhook } = await import("svix");
    const wh = new Webhook(secret);
    const headers = {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    };
    const event = wh.verify(rawBody, headers) as ClerkWebhookEvent;

    if (event.type === "user.created") {
      const email = event.data.email_addresses?.[0]?.email_address;
      if (email) {
        const fullName =
          `${event.data.first_name ?? ""} ${event.data.last_name ?? ""}`.trim() ||
          email.split("@")[0];
        try {
          await ensurePatientForClerk({
            clerkUserId: event.data.id,
            email,
            fullName,
            phone: event.data.phone_numbers?.[0]?.phone_number ?? null,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.message === "EMAIL_USED_BY_OTHER_ROLE") {
            logger.info({ email }, "Skipped patient auto-create — email belongs to doctor/admin");
          } else if (err instanceof Error && err.message === "DOCTOR_NOT_PROVISIONED") {
            logger.info({ email }, "Skipped patient auto-create — doctor must be provisioned in DB first");
          } else {
            throw err;
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Clerk webhook verification failed");
    res.status(400).json({ error: "Invalid webhook" });
  }
});

export default router;
