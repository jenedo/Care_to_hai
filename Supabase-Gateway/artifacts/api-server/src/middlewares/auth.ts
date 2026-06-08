import { type Request, type Response, type NextFunction } from "express";
import { verifyToken, type JWTPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      admin?: JWTPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } });
    return;
  }
  req.admin = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }
    if (!roles.includes(req.admin.role)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: `Role ${req.admin.role} is not permitted for this action` } });
      return;
    }
    next();
  };
}

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  FINANCE: "FINANCE",
  SUPPORT: "SUPPORT",
  VERIFICATION_OFFICER: "VERIFICATION_OFFICER",
} as const;

export const ALL_ROLES = Object.values(ROLES);
export const FINANCE_AND_ABOVE = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FINANCE];
export const SUPPORT_AND_ABOVE = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPPORT];
export const VERIFIER_AND_ABOVE = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.VERIFICATION_OFFICER];
