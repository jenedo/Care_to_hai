import { Router } from "express";
import { fail } from "../lib/errors";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Payment provider webhooks (JazzCash / EasyPaisa).
 * Wire your gateway here — never mark consultations paid from client requests alone.
 */
router.post("/webhooks/payments/jazzcash", async (req, res): Promise<void> => {
  const secret = process.env.JAZZCASH_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json(fail("NOT_CONFIGURED", "JazzCash webhook not configured"));
    return;
  }

  logger.info({ body: req.body }, "JazzCash webhook received (stub — implement verification)");
  res.json({ received: true, status: "pending_implementation" });
});

router.post("/webhooks/payments/easypaisa", async (req, res): Promise<void> => {
  const secret = process.env.EASYPAISA_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json(fail("NOT_CONFIGURED", "EasyPaisa webhook not configured"));
    return;
  }

  logger.info({ body: req.body }, "EasyPaisa webhook received (stub — implement verification)");
  res.json({ received: true, status: "pending_implementation" });
});

export default router;
