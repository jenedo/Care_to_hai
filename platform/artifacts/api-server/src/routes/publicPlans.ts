import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionPlansTable } from "../lib/db";

const router = Router();

/**
 * Public endpoint — no auth required.
 * Returns active subscription plans for the patient app Plans screen.
 */
router.get("/subscriptions/plans/public", async (_req, res): Promise<void> => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.isActive, true));

    plans.sort((a, b) => Number(a.price) - Number(b.price));

    res.json({ data: plans });
  } catch {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

export default router;
