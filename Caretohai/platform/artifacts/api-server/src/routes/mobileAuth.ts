/**
 * Mobile Auth Routes — Supabase phone OTP + email/password
 *
 * POST /api/auth/mobile/send-otp        → send SMS OTP via Supabase
 * POST /api/auth/mobile/verify-otp      → verify OTP, create user record if new
 * POST /api/auth/mobile/email-login     → email+password login for doctors
 * POST /api/auth/mobile/refresh         → refresh Supabase session
 * POST /api/auth/mobile/logout          → sign out
 */
import { Router } from "express";
import { eq } from "drizzle-orm";
import { supabase } from "../lib/supabase";
import { db } from "../lib/db";
import {
  usersTable,
  doctorsTable,
  patientsTable,
} from "../lib/db";
import { signToken } from "../lib/jwt";
import { comparePassword } from "../lib/password";

const router = Router();

// ── Send OTP ──────────────────────────────────────────────────────────────────
router.post("/auth/mobile/send-otp", async (req, res): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Phone required" } });
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      res.status(400).json({ success: false, error: { code: "OTP_FAILED", message: error.message } });
      return;
    }

    res.json({ success: true, data: { message: "OTP sent" } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  }
});

// ── Verify OTP ────────────────────────────────────────────────────────────────
router.post("/auth/mobile/verify-otp", async (req, res): Promise<void> => {
  try {
    const { phone, token, role = "patient" } = req.body;

    if (!phone || !token) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Phone and token required" } });
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error || !data.user) {
      res.status(400).json({ success: false, error: { code: "INVALID_OTP", message: error?.message ?? "Invalid OTP" } });
      return;
    }

    const supabaseUid = data.user.id;

    // Find or create internal user record
    let [user] = await db.select().from(usersTable).where(eq(usersTable.supabaseUid, supabaseUid)).limit(1);

    if (!user) {
      const [newUser] = await db.insert(usersTable).values({
        phone,
        supabaseUid,
        role: role.toUpperCase() as "PATIENT" | "DOCTOR",
        status: "ACTIVE",
        fullName: "",
        email: data.user.email ?? "",
      }).returning();
      user = newUser;

      // Create role-specific profile
      if (role === "doctor") {
        await db.insert(doctorsTable).values({
          userId: newUser.id,
          fullName: "",
          phone,
          verificationStatus: "PENDING",
        });
      } else {
        await db.insert(patientsTable).values({
          userId: newUser.id,
          fullName: "",
          phone,
          status: "ACTIVE",
        });
      }
    }

    // Also issue our own JWT so existing middleware keeps working
    const internalToken = signToken({
      userId: user.id,
      role: user.role as any,
      email: user.email,
      fullName: user.fullName,
    });

    res.json({
      success: true,
      data: {
        accessToken: data.session?.access_token ?? internalToken,
        refreshToken: data.session?.refresh_token ?? "",
        internalToken,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          fullName: user.fullName,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  }
});

// ── Email Login (for doctors who use email+password) ─────────────────────────
// Uses our own bcrypt hash — Supabase Auth is NOT used here because existing
// doctor accounts were seeded with bcrypt hashes in our PostgreSQL DB.
router.post("/auth/mobile/email-login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email and password required" } });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(403).json({ success: false, error: { code: "ACCOUNT_INACTIVE", message: "Account is not active" } });
      return;
    }

    const token = signToken({
      userId: user.id,
      role: user.role as any,
      email: user.email,
      fullName: user.fullName,
    });

    res.json({
      success: true,
      data: {
        accessToken: token,
        refreshToken: "",
        internalToken: token,
        user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  }
});

// ── Refresh Session ───────────────────────────────────────────────────────────
router.post("/auth/mobile/refresh", async (req, res): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "refreshToken required" } });
      return;
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      res.status(401).json({ success: false, error: { code: "REFRESH_FAILED", message: error?.message ?? "Refresh failed" } });
      return;
    }

    res.json({
      success: true,
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/auth/mobile/logout", async (req, res): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await supabase.auth.admin.signOut(token);
    }
    res.json({ success: true, data: { message: "Logged out" } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  }
});

export default router;
