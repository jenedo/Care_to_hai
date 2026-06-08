import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, adminUsersTable } from "../lib/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";

const router = Router();
router.use(requireAuth);

function mapAdminUser(r: {
  id: string; userId: string; role: string; isActive: boolean;
  lastLoginAt: Date | null; createdAt: Date;
  email: string; fullName: string; avatarUrl: string | null;
}) {
  return {
    id: r.id,
    name: r.fullName,
    email: r.email,
    role: r.role,
    status: r.isActive ? "active" : "suspended",
    last_active: r.lastLoginAt?.toISOString() ?? null,
    avatar_url: r.avatarUrl ?? null,
    failed_attempts: 0,
  };
}

router.get("/admin-users", requireRole("SUPER_ADMIN", "ADMIN"), async (_req, res): Promise<void> => {
  const result = await db
    .select({
      id: adminUsersTable.id,
      userId: adminUsersTable.userId,
      role: adminUsersTable.role,
      isActive: adminUsersTable.isActive,
      lastLoginAt: adminUsersTable.lastLoginAt,
      createdAt: adminUsersTable.createdAt,
      email: usersTable.email,
      fullName: usersTable.fullName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(adminUsersTable)
    .innerJoin(usersTable, eq(adminUsersTable.userId, usersTable.id))
    .orderBy(desc(adminUsersTable.createdAt));
  res.json(result.map(mapAdminUser));
});

router.post("/admin-users", requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const { email, fullName, name, password, role } = req.body;
  const displayName = fullName || name;
  if (!email || !displayName || !role) {
    res.status(400).json({ error: "email, name and role are required" }); return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length) { res.status(400).json({ error: "Email already in use" }); return; }
  const generatedPassword = password || `Admin@${Math.random().toString(36).slice(2, 10)}`;
  const passwordHash = await bcrypt.hash(generatedPassword, 12);
  const newUser = await db.insert(usersTable).values({ email: email.toLowerCase(), fullName: displayName, passwordHash, role: "ADMIN", status: "ACTIVE" }).returning();
  const newAdmin = await db.insert(adminUsersTable).values({ userId: newUser[0].id, role, isActive: true }).returning();
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "ADMIN_USER_CREATED", entityType: "AdminUser", entityId: newAdmin[0].id, newValue: { email, role } });
  res.status(201).json(mapAdminUser({
    id: newAdmin[0].id,
    userId: newAdmin[0].userId!,
    role: newAdmin[0].role,
    isActive: newAdmin[0].isActive,
    lastLoginAt: newAdmin[0].lastLoginAt,
    createdAt: newAdmin[0].createdAt,
    email: newUser[0].email,
    fullName: newUser[0].fullName,
    avatarUrl: newUser[0].avatarUrl,
  }));
});

router.patch("/admin-users/:id/status", requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const { isActive, status } = req.body;
  const activeVal = typeof isActive === "boolean" ? isActive : status === "active";
  const admin = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, (req.params.id as string))).limit(1);
  if (!admin.length) { res.status(404).json({ error: "Admin user not found" }); return; }
  if (admin[0].userId === req.admin!.userId) { res.status(400).json({ error: "Cannot change your own status" }); return; }
  await db.update(adminUsersTable).set({ isActive: activeVal, updatedAt: new Date() }).where(eq(adminUsersTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: activeVal ? "ADMIN_ACTIVATED" : "ADMIN_DEACTIVATED", entityType: "AdminUser", entityId: (req.params.id as string) });
  const [updated] = await db
    .select({ id: adminUsersTable.id, userId: adminUsersTable.userId, role: adminUsersTable.role, isActive: adminUsersTable.isActive, lastLoginAt: adminUsersTable.lastLoginAt, createdAt: adminUsersTable.createdAt, email: usersTable.email, fullName: usersTable.fullName, avatarUrl: usersTable.avatarUrl })
    .from(adminUsersTable)
    .innerJoin(usersTable, eq(adminUsersTable.userId, usersTable.id))
    .where(eq(adminUsersTable.id, (req.params.id as string)));
  res.json(mapAdminUser(updated));
});

router.patch("/admin-users/:id/role", requireRole("SUPER_ADMIN"), async (req, res): Promise<void> => {
  const { role } = req.body;
  const admin = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, (req.params.id as string))).limit(1);
  if (!admin.length) { res.status(404).json({ error: "Admin user not found" }); return; }
  await db.update(adminUsersTable).set({ role, updatedAt: new Date() }).where(eq(adminUsersTable.id, (req.params.id as string)));
  await writeAudit({ req, actorId: req.admin!.userId, actorName: req.admin!.fullName, actorRole: req.admin!.role, action: "ADMIN_ROLE_CHANGED", entityType: "AdminUser", entityId: (req.params.id as string), oldValue: { role: admin[0].role }, newValue: { role } });
  const [updated] = await db
    .select({ id: adminUsersTable.id, userId: adminUsersTable.userId, role: adminUsersTable.role, isActive: adminUsersTable.isActive, lastLoginAt: adminUsersTable.lastLoginAt, createdAt: adminUsersTable.createdAt, email: usersTable.email, fullName: usersTable.fullName, avatarUrl: usersTable.avatarUrl })
    .from(adminUsersTable)
    .innerJoin(usersTable, eq(adminUsersTable.userId, usersTable.id))
    .where(eq(adminUsersTable.id, (req.params.id as string)));
  res.json(mapAdminUser(updated));
});

export default router;
