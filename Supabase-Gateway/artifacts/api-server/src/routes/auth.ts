import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, adminUsersTable, doctorsTable } from "../lib/db";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email and password required" } });
    return;
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user.length || user[0].role !== "ADMIN") {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const adminRecord = await db.select().from(adminUsersTable).where(eq(adminUsersTable.userId, user[0].id)).limit(1);
  if (!adminRecord.length || !adminRecord[0].isActive) {
    res.status(401).json({ success: false, error: { code: "ACCOUNT_INACTIVE", message: "Account is not active" } });
    return;
  }

  const passwordHash = (user[0] as any).passwordHash;
  if (!passwordHash) {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  await db.update(adminUsersTable).set({ lastLoginAt: new Date() }).where(eq(adminUsersTable.userId, user[0].id));

  const token = signToken({
    userId: user[0].id,
    adminId: adminRecord[0].id,
    email: user[0].email,
    fullName: user[0].fullName,
    role: adminRecord[0].role,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await writeAudit({
    req,
    actorId: user[0].id,
    actorName: user[0].fullName,
    actorRole: adminRecord[0].role,
    action: "ADMIN_LOGIN",
    entityType: "AdminUser",
    entityId: adminRecord[0].id,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user[0].id,
        adminId: adminRecord[0].id,
        email: user[0].email,
        fullName: user[0].fullName,
        role: adminRecord[0].role,
        avatarUrl: user[0].avatarUrl,
      },
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const user = await db.select().from(usersTable).where(eq(usersTable.id, admin.userId)).limit(1);
  if (!user.length) {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
    return;
  }
  const adminRecord = await db.select().from(adminUsersTable).where(eq(adminUsersTable.userId, admin.userId)).limit(1);
  res.json({
    success: true,
    data: {
      id: user[0].id,
      adminId: adminRecord[0]?.id,
      email: user[0].email,
      fullName: user[0].fullName,
      role: adminRecord[0]?.role ?? admin.role,
      avatarUrl: user[0].avatarUrl,
    },
  });
});

router.post("/auth/logout", requireAuth, (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, data: { message: "Logged out" } });
});

router.post("/auth/doctor/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email and password required" } });
    return;
  }

  const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.email, email.toLowerCase())).limit(1);
  if (!doctor.length) {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.id, doctor[0].userId!)).limit(1);
  const passwordHash = user.length ? (user[0] as any).passwordHash : null;

  if (!passwordHash) {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const token = signToken({
    userId: doctor[0].userId!,
    adminId: "",
    email: doctor[0].email,
    fullName: doctor[0].fullName,
    role: "DOCTOR",
  });

  res.cookie("doctor_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: {
      token,
      doctor: {
        id: doctor[0].id,
        email: doctor[0].email,
        fullName: doctor[0].fullName,
        specialty: doctor[0].specialty,
        city: doctor[0].city,
        verificationStatus: doctor[0].verificationStatus,
        avatarUrl: doctor[0].avatarUrl,
      },
    },
  });
});

router.get("/auth/doctor/me", async (req, res): Promise<void> => {
  const token = req.cookies?.doctor_token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
    return;
  }
  const { verifyToken } = await import("../lib/jwt");
  const payload = verifyToken(token);
  if (!payload || payload.role !== "DOCTOR") {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } });
    return;
  }
  const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, payload.userId)).limit(1);
  if (!doctor.length) {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Doctor not found" } });
    return;
  }
  res.json({ success: true, data: doctor[0] });
});

export default router;
