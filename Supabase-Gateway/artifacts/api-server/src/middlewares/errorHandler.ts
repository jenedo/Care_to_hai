import { type Request, type Response, type NextFunction } from "express";
import { AppError, fail } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(fail("NOT_FOUND", `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(fail(err.code, err.message, err.details));
    return;
  }

  logger.error({ err, req: { method: req.method, url: req.url } }, "Unhandled error");

  res.status(500).json(fail("INTERNAL_ERROR", "An unexpected error occurred"));
}
