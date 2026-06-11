import { type NextFunction, type Request, type Response } from "express";
import { AppError, fail } from "../lib/errors";
import { logger } from "../lib/logger";

const isProduction = process.env.NODE_ENV === "production";

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
    if (err.statusCode >= 500) {
      logger.error(
        {
          err,
          req: {
            method: req.method,
            url: req.url,
          },
        },
        "Operational server error",
      );
    }

    res.status(err.statusCode).json(
      fail(
        err.code,
        err.message,
        isProduction ? undefined : err.details,
      ),
    );
    return;
  }

  logger.error(
    {
      err,
      req: {
        method: req.method,
        url: req.url,
      },
    },
    "Unhandled error",
  );

  res.status(500).json(
    fail(
      "INTERNAL_ERROR",
      isProduction ? "An unexpected error occurred" : err instanceof Error ? err.message : "Unknown error",
    ),
  );
}