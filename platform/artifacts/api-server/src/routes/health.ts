import { Router } from "express";
import { HealthCheckResponse } from "@asaancare/api-zod";

const router = Router();

router.get("/healthz", (_req, res): void => {
  const data = HealthCheckResponse.parse({
    status: "ok",
  });

  res.setHeader("Cache-Control", "no-store");
  res.json(data);
});

export default router;