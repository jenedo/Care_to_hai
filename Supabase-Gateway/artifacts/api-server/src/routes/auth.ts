// Replit old code due to most of error so we made gpt code down

// import { Router } from "express";
// import bcrypt from "bcryptjs";
// import { eq } from "drizzle-orm";
// import { db, usersTable, adminUsersTable, doctorsTable, patientsTable } from "../lib/db";
// import { signToken } from "../lib/jwt";
// import { requireAuth } from "../middlewares/auth";
// import { writeAudit } from "../lib/audit";

// const router = Router();

// router.post("/auth/login", async (req, res): Promise<void> => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email and password required" } });
//     return;
//   }

//   const user = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
//   if (!user.length || user[0].role !== "ADMIN") {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   const adminRecord = await db.select().from(adminUsersTable).where(eq(adminUsersTable.userId, user[0].id)).limit(1);
//   if (!adminRecord.length || !adminRecord[0].isActive) {
//     res.status(401).json({ success: false, error: { code: "ACCOUNT_INACTIVE", message: "Account is not active" } });
//     return;
//   }

//   const passwordHash = (user[0] as any).passwordHash;
//   if (!passwordHash) {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   const valid = await bcrypt.compare(password, passwordHash);
//   if (!valid) {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   await db.update(adminUsersTable).set({ lastLoginAt: new Date() }).where(eq(adminUsersTable.userId, user[0].id));

//   const token = signToken({
//     userId: user[0].id,
//     adminId: adminRecord[0].id,
//     email: user[0].email,
//     fullName: user[0].fullName,
//     role: adminRecord[0].role,
//   });

//   res.cookie("token", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });

//   await writeAudit({
//     req,
//     actorId: user[0].id,
//     actorName: user[0].fullName,
//     actorRole: adminRecord[0].role,
//     action: "ADMIN_LOGIN",
//     entityType: "AdminUser",
//     entityId: adminRecord[0].id,
//   });

//   res.json({
//     success: true,
//     data: {
//       token,
//       user: {
//         id: user[0].id,
//         adminId: adminRecord[0].id,
//         email: user[0].email,
//         fullName: user[0].fullName,
//         role: adminRecord[0].role,
//         avatarUrl: user[0].avatarUrl,
//       },
//     },
//   });
// });

// router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
//   const admin = req.admin!;
//   const user = await db.select().from(usersTable).where(eq(usersTable.id, admin.userId)).limit(1);
//   if (!user.length) {
//     res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
//     return;
//   }
//   const adminRecord = await db.select().from(adminUsersTable).where(eq(adminUsersTable.userId, admin.userId)).limit(1);
//   res.json({
//     success: true,
//     data: {
//       id: user[0].id,
//       adminId: adminRecord[0]?.id,
//       email: user[0].email,
//       fullName: user[0].fullName,
//       role: adminRecord[0]?.role ?? admin.role,
//       avatarUrl: user[0].avatarUrl,
//     },
//   });
// });

// router.post("/auth/logout", requireAuth, (req, res) => {
//   res.clearCookie("token");
//   res.json({ success: true, data: { message: "Logged out" } });
// });

// router.post("/auth/doctor/login", async (req, res): Promise<void> => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email and password required" } });
//     return;
//   }

//   const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.email, email.toLowerCase())).limit(1);
//   if (!doctor.length) {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   const user = await db.select().from(usersTable).where(eq(usersTable.id, doctor[0].userId!)).limit(1);
//   const passwordHash = user.length ? (user[0] as any).passwordHash : null;

//   if (!passwordHash) {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   const valid = await bcrypt.compare(password, passwordHash);
//   if (!valid) {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   const token = signToken({
//     userId: doctor[0].userId!,
//     adminId: "",
//     email: doctor[0].email,
//     fullName: doctor[0].fullName,
//     role: "DOCTOR",
//   });

//   res.cookie("doctor_token", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });

//   res.json({
//     success: true,
//     data: {
//       token,
//       doctor: {
//         id: doctor[0].id,
//         email: doctor[0].email,
//         fullName: doctor[0].fullName,
//         specialty: doctor[0].specialty,
//         city: doctor[0].city,
//         verificationStatus: doctor[0].verificationStatus,
//         avatarUrl: doctor[0].avatarUrl,
//       },
//     },
//   });
// });

// router.get("/auth/doctor/me", async (req, res): Promise<void> => {
//   const token = req.cookies?.doctor_token || req.headers.authorization?.replace("Bearer ", "");
//   if (!token) {
//     res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
//     return;
//   }
//   const { verifyToken } = await import("../lib/jwt");
//   const payload = verifyToken(token);
//   if (!payload || payload.role !== "DOCTOR") {
//     res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } });
//     return;
//   }
//   const doctor = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, payload.userId)).limit(1);
//   if (!doctor.length) {
//     res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Doctor not found" } });
//     return;
//   }
//   res.json({ success: true, data: doctor[0] });
// });

// // â”€â”€ PATIENT AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// router.post("/auth/patient/login", async (req, res): Promise<void> => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email and password required" } });
//     return;
//   }

//   const patient = await db.select().from(patientsTable).where(eq(patientsTable.email, email.toLowerCase())).limit(1);
//   if (!patient.length) {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   const user = await db.select().from(usersTable).where(eq(usersTable.id, patient[0].userId!)).limit(1);
//   const passwordHash = user.length ? (user[0] as any).passwordHash : null;

//   if (!passwordHash) {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   const valid = await bcrypt.compare(password, passwordHash);
//   if (!valid) {
//     res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
//     return;
//   }

//   const token = signToken({
//     userId: patient[0].userId!,
//     adminId: "",
//     email: patient[0].email ?? "",
//     fullName: patient[0].fullName,
//     role: "PATIENT",
//   });

//   res.cookie("patient_token", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });

//   res.json({
//     success: true,
//     data: {
//       token,
//       patient: {
//         id: patient[0].id,
//         email: patient[0].email,
//         fullName: patient[0].fullName,
//         phone: patient[0].phone,
//       },
//     },
//   });
// });

// router.get("/auth/patient/me", async (req, res): Promise<void> => {
//   const token = req.cookies?.patient_token || req.headers.authorization?.replace("Bearer ", "");
//   if (!token) {
//     res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
//     return;
//   }
//   const { verifyToken } = await import("../lib/jwt");
//   const payload = verifyToken(token);
//   if (!payload || payload.role !== "PATIENT") {
//     res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } });
//     return;
//   }
//   const patient = await db.select().from(patientsTable).where(eq(patientsTable.userId, payload.userId)).limit(1);
//   if (!patient.length) {
//     res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Patient not found" } });
//     return;
//   }
//   res.json({ success: true, data: patient[0] });
// });

// router.post("/auth/patient/logout", (req, res) => {
//   res.clearCookie("patient_token");
//   res.json({ success: true });
// });

// router.post("/auth/patient/register", async (req, res): Promise<void> => {
//   const { fullName, email, password, phone } = req.body;

//   if (!fullName?.trim() || !email?.trim() || !password?.trim() || !phone?.trim()) {
//     res.status(400).json({
//       success: false,
//       error: { code: "VALIDATION_ERROR", message: "Full name, email, phone and password are required" },
//     });
//     return;
//   }

//   const existing = await db.select({ id: usersTable.id })
//     .from(usersTable)
//     .where(eq(usersTable.email, email.toLowerCase().trim()))
//     .limit(1);

//   if (existing.length) {
//     res.status(409).json({
//       success: false,
//       error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" },
//     });
//     return;
//   }

//   const passwordHash = await bcrypt.hash(password, 12);

//   const [newUser] = await db.insert(usersTable).values({
//     email: email.toLowerCase().trim(),
//     fullName: fullName.trim(),
//     passwordHash,
//     role: "PATIENT",
//     status: "ACTIVE",
//     phone: phone.trim(),
//   }).returning();

//   const [newPatient] = await db.insert(patientsTable).values({
//     userId: newUser.id,
//     fullName: fullName.trim(),
//     email: email.toLowerCase().trim(),
//     phone: phone.trim(),
//     status: "ACTIVE",
//   }).returning();

//   const token = signToken({
//     userId: newUser.id,
//     adminId: "",
//     email: newUser.email,
//     fullName: newUser.fullName,
//     role: "PATIENT",
//   });

//   res.cookie("patient_token", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });

//   res.status(201).json({
//     success: true,
//     data: {
//       token,
//       patient: {
//         id: newPatient.id,
//         email: newPatient.email,
//         fullName: newPatient.fullName,
//         phone: newPatient.phone,
//       },
//     },
//   });
// });

// export default router;

// gpt code new fix all bug improve code


// import { Router, type Response } from "express";
// import bcrypt from "bcryptjs";
// import rateLimit from "express-rate-limit";
// import { eq } from "drizzle-orm";

// import {
//   db,
//   usersTable,
//   adminUsersTable,
//   doctorsTable,
//   patientsTable,
// } from "../lib/db";

// import { signToken, verifyToken } from "../lib/jwt";
// import { requireAuth } from "../middlewares/auth";
// import { writeAudit } from "../lib/audit";

// const router = Router();

// const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// const cookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "lax" as const,
//   maxAge: COOKIE_MAX_AGE,
// };

// const clearCookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "lax" as const,
// };

// const authRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   limit: 20,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     error: {
//       code: "TOO_MANY_ATTEMPTS",
//       message: "Too many attempts. Please try again later.",
//     },
//   },
// });

// function normalizeEmail(value: unknown): string {
//   return typeof value === "string" ? value.trim().toLowerCase() : "";
// }

// function normalizeText(value: unknown): string {
//   return typeof value === "string" ? value.trim() : "";
// }

// function isStrongPassword(password: string): boolean {
//   return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
// }

// function sendInvalidCredentials(res: Response): void {
//   res.status(401).json({
//     success: false,
//     error: {
//       code: "INVALID_CREDENTIALS",
//       message: "Invalid email or password",
//     },
//   });
// }

// function sendValidationError(res: Response, message: string): void {
//   res.status(400).json({
//     success: false,
//     error: {
//       code: "VALIDATION_ERROR",
//       message,
//     },
//   });
// }

// function getBearerToken(req: any): string {
//   const header = req.headers?.authorization;

//   if (typeof header === "string" && header.startsWith("Bearer ")) {
//     return header.replace("Bearer ", "").trim();
//   }

//   return "";
// }

// function getDoctorToken(req: any): string {
//   return req.cookies?.doctor_token || getBearerToken(req);
// }

// function getPatientToken(req: any): string {
//   return req.cookies?.patient_token || getBearerToken(req);
// }

// // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// // ADMIN AUTH
// // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// router.post("/auth/login", authRateLimit, async (req, res): Promise<void> => {
//   try {
//     const email = normalizeEmail(req.body.email);
//     const password = normalizeText(req.body.password);

//     if (!email || !password) {
//       sendValidationError(res, "Email and password required");
//       return;
//     }

//     const user = await db
//       .select()
//       .from(usersTable)
//       .where(eq(usersTable.email, email))
//       .limit(1);

//     if (!user.length) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const adminRecord = await db
//       .select()
//       .from(adminUsersTable)
//       .where(eq(adminUsersTable.userId, user[0].id))
//       .limit(1);

//     if (!adminRecord.length || !adminRecord[0].isActive) {
//       res.status(401).json({
//         success: false,
//         error: {
//           code: "ACCOUNT_INACTIVE",
//           message: "Account is not active",
//         },
//       });
//       return;
//     }

//     const passwordHash = (user[0] as any).passwordHash;

//     if (!passwordHash) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const valid = await bcrypt.compare(password, passwordHash);

//     if (!valid) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     await db
//       .update(adminUsersTable)
//       .set({ lastLoginAt: new Date() })
//       .where(eq(adminUsersTable.userId, user[0].id));

//     const token = signToken({
//       userId: user[0].id,
//       adminId: adminRecord[0].id,
//       email: user[0].email,
//       fullName: user[0].fullName,
//       role: adminRecord[0].role,
//     });

//     res.cookie("token", token, cookieOptions);

//     await writeAudit({
//       req,
//       actorId: user[0].id,
//       actorName: user[0].fullName,
//       actorRole: adminRecord[0].role,
//       action: "ADMIN_LOGIN",
//       entityType: "AdminUser",
//       entityId: adminRecord[0].id,
//     });

//     res.json({
//       success: true,
//       data: {
//         user: {
//           id: user[0].id,
//           adminId: adminRecord[0].id,
//           email: user[0].email,
//           fullName: user[0].fullName,
//           role: adminRecord[0].role,
//           avatarUrl: user[0].avatarUrl,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Admin login error:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         code: "INTERNAL_ERROR",
//         message: "Something went wrong",
//       },
//     });
//   }
// });

// router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
//   try {
//     const admin = req.admin!;

//     const user = await db
//       .select()
//       .from(usersTable)
//       .where(eq(usersTable.id, admin.userId))
//       .limit(1);

//     if (!user.length) {
//       res.status(404).json({
//         success: false,
//         error: {
//           code: "NOT_FOUND",
//           message: "User not found",
//         },
//       });
//       return;
//     }

//     const adminRecord = await db
//       .select()
//       .from(adminUsersTable)
//       .where(eq(adminUsersTable.userId, admin.userId))
//       .limit(1);

//     if (!adminRecord.length || !adminRecord[0].isActive) {
//       res.status(401).json({
//         success: false,
//         error: {
//           code: "ACCOUNT_INACTIVE",
//           message: "Account is not active",
//         },
//       });
//       return;
//     }

//     res.json({
//       success: true,
//       data: {
//         id: user[0].id,
//         adminId: adminRecord[0].id,
//         email: user[0].email,
//         fullName: user[0].fullName,
//         role: adminRecord[0].role,
//         avatarUrl: user[0].avatarUrl,
//       },
//     });
//   } catch (error) {
//     console.error("Admin me error:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         code: "INTERNAL_ERROR",
//         message: "Something went wrong",
//       },
//     });
//   }
// });

// router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
//   try {
//     res.clearCookie("token", clearCookieOptions);

//     if (req.admin) {
//       await writeAudit({
//         req,
//         actorId: req.admin.userId,
//         actorName: req.admin.fullName,
//         actorRole: req.admin.role,
//         action: "ADMIN_LOGOUT",
//         entityType: "AdminUser",
//         entityId: req.admin.adminId,
//       });
//     }

//     res.json({
//       success: true,
//       data: {
//         message: "Logged out",
//       },
//     });
//   } catch (error) {
//     console.error("Admin logout error:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         code: "INTERNAL_ERROR",
//         message: "Something went wrong",
//       },
//     });
//   }
// });

// // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// // DOCTOR AUTH
// // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// router.post("/auth/doctor/login", authRateLimit, async (req, res): Promise<void> => {
//   try {
//     const email = normalizeEmail(req.body.email);
//     const password = normalizeText(req.body.password);

//     if (!email || !password) {
//       sendValidationError(res, "Email and password required");
//       return;
//     }

//     const doctor = await db
//       .select()
//       .from(doctorsTable)
//       .where(eq(doctorsTable.email, email))
//       .limit(1);

//     if (!doctor.length || !doctor[0].userId) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const user = await db
//       .select()
//       .from(usersTable)
//       .where(eq(usersTable.id, doctor[0].userId))
//       .limit(1);

//     if (!user.length) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const passwordHash = (user[0] as any).passwordHash;

//     if (!passwordHash) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const valid = await bcrypt.compare(password, passwordHash);

//     if (!valid) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const userStatus = (user[0] as any).status;
//     const doctorStatus = (doctor[0] as any).status;

//     if (userStatus && userStatus !== "ACTIVE") {
//       res.status(403).json({
//         success: false,
//         error: {
//           code: "ACCOUNT_INACTIVE",
//           message: "Doctor account is not active",
//         },
//       });
//       return;
//     }

//     if (doctorStatus && doctorStatus !== "ACTIVE") {
//       res.status(403).json({
//         success: false,
//         error: {
//           code: "DOCTOR_INACTIVE",
//           message: "Doctor profile is not active",
//         },
//       });
//       return;
//     }

//     const token = signToken({
//       userId: doctor[0].userId,
//       adminId: "",
//       email: doctor[0].email,
//       fullName: doctor[0].fullName,
//       role: "DOCTOR",
//     });

//     res.cookie("doctor_token", token, cookieOptions);

//     await writeAudit({
//       req,
//       actorId: doctor[0].userId,
//       actorName: doctor[0].fullName,
//       actorRole: "DOCTOR",
//       action: "DOCTOR_LOGIN",
//       entityType: "Doctor",
//       entityId: doctor[0].id,
//     });

//     res.json({
//       success: true,
//       data: {
//         doctor: {
//           id: doctor[0].id,
//           email: doctor[0].email,
//           fullName: doctor[0].fullName,
//           specialty: doctor[0].specialty,
//           city: doctor[0].city,
//           verificationStatus: doctor[0].verificationStatus,
//           avatarUrl: doctor[0].avatarUrl,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Doctor login error:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         code: "INTERNAL_ERROR",
//         message: "Something went wrong",
//       },
//     });
//   }
// });

// router.get("/auth/doctor/me", async (req, res): Promise<void> => {
//   try {
//     const token = getDoctorToken(req);

//     if (!token) {
//       res.status(401).json({
//         success: false,
//         error: {
//           code: "UNAUTHORIZED",
//           message: "Not authenticated",
//         },
//       });
//       return;
//     }

//     const payload = verifyToken(token);

//     if (!payload || payload.role !== "DOCTOR") {
//       res.status(401).json({
//         success: false,
//         error: {
//           code: "UNAUTHORIZED",
//           message: "Invalid token",
//         },
//       });
//       return;
//     }

//     const doctor = await db
//       .select()
//       .from(doctorsTable)
//       .where(eq(doctorsTable.userId, payload.userId))
//       .limit(1);

//     if (!doctor.length) {
//       res.status(404).json({
//         success: false,
//         error: {
//           code: "NOT_FOUND",
//           message: "Doctor not found",
//         },
//       });
//       return;
//     }

//     res.json({
//       success: true,
//       data: {
//         id: doctor[0].id,
//         userId: doctor[0].userId,
//         email: doctor[0].email,
//         fullName: doctor[0].fullName,
//         specialty: doctor[0].specialty,
//         city: doctor[0].city,
//         verificationStatus: doctor[0].verificationStatus,
//         avatarUrl: doctor[0].avatarUrl,
//       },
//     });
//   } catch (error) {
//     console.error("Doctor me error:", error);
//     res.status(401).json({
//       success: false,
//       error: {
//         code: "UNAUTHORIZED",
//         message: "Invalid token",
//       },
//     });
//   }
// });

// router.post("/auth/doctor/logout", async (req, res): Promise<void> => {
//   try {
//     res.clearCookie("doctor_token", clearCookieOptions);

//     res.json({
//       success: true,
//       data: {
//         message: "Logged out",
//       },
//     });
//   } catch (error) {
//     console.error("Doctor logout error:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         code: "INTERNAL_ERROR",
//         message: "Something went wrong",
//       },
//     });
//   }
// });

// // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// // PATIENT AUTH
// // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// router.post("/auth/patient/login", authRateLimit, async (req, res): Promise<void> => {
//   try {
//     const email = normalizeEmail(req.body.email);
//     const password = normalizeText(req.body.password);

//     if (!email || !password) {
//       sendValidationError(res, "Email and password required");
//       return;
//     }

//     const patient = await db
//       .select()
//       .from(patientsTable)
//       .where(eq(patientsTable.email, email))
//       .limit(1);

//     if (!patient.length || !patient[0].userId) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const user = await db
//       .select()
//       .from(usersTable)
//       .where(eq(usersTable.id, patient[0].userId))
//       .limit(1);

//     if (!user.length) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const passwordHash = (user[0] as any).passwordHash;

//     if (!passwordHash) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const valid = await bcrypt.compare(password, passwordHash);

//     if (!valid) {
//       sendInvalidCredentials(res);
//       return;
//     }

//     const userStatus = (user[0] as any).status;
//     const patientStatus = (patient[0] as any).status;

//     if (userStatus && userStatus !== "ACTIVE") {
//       res.status(403).json({
//         success: false,
//         error: {
//           code: "ACCOUNT_INACTIVE",
//           message: "Patient account is not active",
//         },
//       });
//       return;
//     }

//     if (patientStatus && patientStatus !== "ACTIVE") {
//       res.status(403).json({
//         success: false,
//         error: {
//           code: "PATIENT_INACTIVE",
//           message: "Patient profile is not active",
//         },
//       });
//       return;
//     }

//     const token = signToken({
//       userId: patient[0].userId,
//       adminId: "",
//       email: patient[0].email ?? "",
//       fullName: patient[0].fullName,
//       role: "PATIENT",
//     });

//     res.cookie("patient_token", token, cookieOptions);

//     await writeAudit({
//       req,
//       actorId: patient[0].userId,
//       actorName: patient[0].fullName,
//       actorRole: "PATIENT",
//       action: "PATIENT_LOGIN",
//       entityType: "Patient",
//       entityId: patient[0].id,
//     });

//     res.json({
//       success: true,
//       data: {
//         patient: {
//           id: patient[0].id,
//           email: patient[0].email,
//           fullName: patient[0].fullName,
//           phone: patient[0].phone,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Patient login error:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         code: "INTERNAL_ERROR",
//         message: "Something went wrong",
//       },
//     });
//   }
// });

// router.get("/auth/patient/me", async (req, res): Promise<void> => {
//   try {
//     const token = getPatientToken(req);

//     if (!token) {
//       res.status(401).json({
//         success: false,
//         error: {
//           code: "UNAUTHORIZED",
//           message: "Not authenticated",
//         },
//       });
//       return;
//     }

//     const payload = verifyToken(token);

//     if (!payload || payload.role !== "PATIENT") {
//       res.status(401).json({
//         success: false,
//         error: {
//           code: "UNAUTHORIZED",
//           message: "Invalid token",
//         },
//       });
//       return;
//     }

//     const patient = await db
//       .select()
//       .from(patientsTable)
//       .where(eq(patientsTable.userId, payload.userId))
//       .limit(1);

//     if (!patient.length) {
//       res.status(404).json({
//         success: false,
//         error: {
//           code: "NOT_FOUND",
//           message: "Patient not found",
//         },
//       });
//       return;
//     }

//     res.json({
//       success: true,
//       data: {
//         id: patient[0].id,
//         userId: patient[0].userId,
//         email: patient[0].email,
//         fullName: patient[0].fullName,
//         phone: patient[0].phone,
//       },
//     });
//   } catch (error) {
//     console.error("Patient me error:", error);
//     res.status(401).json({
//       success: false,
//       error: {
//         code: "UNAUTHORIZED",
//         message: "Invalid token",
//       },
//     });
//   }
// });

// router.post("/auth/patient/logout", async (req, res): Promise<void> => {
//   try {
//     res.clearCookie("patient_token", clearCookieOptions);

//     res.json({
//       success: true,
//       data: {
//         message: "Logged out",
//       },
//     });
//   } catch (error) {
//     console.error("Patient logout error:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         code: "INTERNAL_ERROR",
//         message: "Something went wrong",
//       },
//     });
//   }
// });

// router.post("/auth/patient/register", authRateLimit, async (req, res): Promise<void> => {
//   try {
//     const fullName = normalizeText(req.body.fullName);
//     const email = normalizeEmail(req.body.email);
//     const password = normalizeText(req.body.password);
//     const phone = normalizeText(req.body.phone);

//     if (!fullName || !email || !password || !phone) {
//       sendValidationError(res, "Full name, email, phone and password are required");
//       return;
//     }

//     if (!isStrongPassword(password)) {
//       res.status(400).json({
//         success: false,
//         error: {
//           code: "WEAK_PASSWORD",
//           message:
//             "Password must be at least 8 characters and include uppercase, lowercase and number",
//         },
//       });
//       return;
//     }

//     const existing = await db
//       .select({ id: usersTable.id })
//       .from(usersTable)
//       .where(eq(usersTable.email, email))
//       .limit(1);

//     if (existing.length) {
//       res.status(409).json({
//         success: false,
//         error: {
//           code: "EMAIL_EXISTS",
//           message: "An account with this email already exists",
//         },
//       });
//       return;
//     }

//     const passwordHash = await bcrypt.hash(password, 12);

//     const { newUser, newPatient } = await db.transaction(async (tx) => {
//       const [createdUser] = await tx
//         .insert(usersTable)
//         .values({
//           email,
//           fullName,
//           passwordHash,
//           role: "PATIENT",
//           status: "ACTIVE",
//           phone,
//         })
//         .returning();

//       const [createdPatient] = await tx
//         .insert(patientsTable)
//         .values({
//           userId: createdUser.id,
//           fullName,
//           email,
//           phone,
//           status: "ACTIVE",
//         })
//         .returning();

//       return {
//         newUser: createdUser,
//         newPatient: createdPatient,
//       };
//     });

//     const token = signToken({
//       userId: newUser.id,
//       adminId: "",
//       email: newUser.email,
//       fullName: newUser.fullName,
//       role: "PATIENT",
//     });

//     res.cookie("patient_token", token, cookieOptions);

//     await writeAudit({
//       req,
//       actorId: newUser.id,
//       actorName: newUser.fullName,
//       actorRole: "PATIENT",
//       action: "PATIENT_REGISTER",
//       entityType: "Patient",
//       entityId: newPatient.id,
//     });

//     res.status(201).json({
//       success: true,
//       data: {
//         patient: {
//           id: newPatient.id,
//           email: newPatient.email,
//           fullName: newPatient.fullName,
//           phone: newPatient.phone,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Patient register error:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         code: "INTERNAL_ERROR",
//         message: "Something went wrong",
//       },
//     });
//   }
// });

// export default router;

import { Router, type Response } from "express";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  db,
  usersTable,
  adminUsersTable,
  doctorsTable,
  patientsTable,
} from "../lib/db";

import { signToken } from "../lib/jwt";
import {
  ADMIN_COOKIE,
  DOCTOR_COOKIE,
  PATIENT_COOKIE,
  authCookieOptions,
  clearAuthCookieOptions,
} from "../lib/cookies";

import {
  hashPassword,
  verifyPassword,
  isStrongPassword,
} from "../lib/password";

import {
  requireAuth,
  requireDoctorAuth,
  requirePatientAuth,
} from "../middlewares/auth";

import {
  loginSchema,
  patientRegisterSchema,
} from "../validators/auth.validators";

import { writeAudit } from "../lib/audit";

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many attempts. Please try again later.",
    },
  },
});

function sendInvalidCredentials(res: Response): void {
  res.status(401).json({
    success: false,
    error: {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    },
  });
}

function sendValidationError(res: Response, message = "Invalid input"): void {
  res.status(400).json({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  });
}

function sendInternalError(res: Response): void {
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    },
  });
}

function parseZod<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): { success: true; data: T } | { success: false } {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return { success: false };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN AUTH
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post("/auth/login", authRateLimit, async (req, res): Promise<void> => {
  try {
    const parsed = parseZod(loginSchema, req.body);

    if (!parsed.success) {
      sendValidationError(res, "Email and password required");
      return;
    }

    const { email, password } = parsed.data;

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user.length) {
      sendInvalidCredentials(res);
      return;
    }

    const passwordHash = (user[0] as any).passwordHash;

    if (!passwordHash) {
      sendInvalidCredentials(res);
      return;
    }

    const validPassword = await verifyPassword(password, passwordHash);

    if (!validPassword) {
      sendInvalidCredentials(res);
      return;
    }

    const adminRecord = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.userId, user[0].id))
      .limit(1);

    if (!adminRecord.length || !adminRecord[0].isActive) {
      res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "Admin account is not active",
        },
      });
      return;
    }

    const userStatus = (user[0] as any).status;

    if (userStatus && userStatus !== "ACTIVE") {
      res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "User account is not active",
        },
      });
      return;
    }

    await db
      .update(adminUsersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsersTable.userId, user[0].id));

    const token = signToken({
      userId: user[0].id,
      adminId: adminRecord[0].id,
      email: user[0].email,
      fullName: user[0].fullName,
      role: adminRecord[0].role,
    });

    res.cookie(ADMIN_COOKIE, token, authCookieOptions);

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
  } catch (error) {
    console.error("Admin login error:", error);
    sendInternalError(res);
  }
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const auth = req.admin!;

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, auth.userId))
      .limit(1);

    if (!user.length) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
      return;
    }

    const adminRecord = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.userId, auth.userId))
      .limit(1);

    if (!adminRecord.length || !adminRecord[0].isActive) {
      res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "Admin account is not active",
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user[0].id,
        adminId: adminRecord[0].id,
        email: user[0].email,
        fullName: user[0].fullName,
        role: adminRecord[0].role,
        avatarUrl: user[0].avatarUrl,
      },
    });
  } catch (error) {
    console.error("Admin me error:", error);
    sendInternalError(res);
  }
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  try {
    res.clearCookie(ADMIN_COOKIE, clearAuthCookieOptions);

    if (req.admin) {
      await writeAudit({
        req,
        actorId: req.admin.userId,
        actorName: req.admin.fullName ?? "Unknown",
        actorRole: req.admin.role,
        action: "ADMIN_LOGOUT",
        entityType: "AdminUser",
        entityId: req.admin.adminId ?? req.admin.userId,
      });
    }

    res.json({
      success: true,
      data: {
        message: "Logged out",
      },
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    sendInternalError(res);
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DOCTOR AUTH
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post(
  "/auth/doctor/login",
  authRateLimit,
  async (req, res): Promise<void> => {
    try {
      const parsed = parseZod(loginSchema, req.body);

      if (!parsed.success) {
        sendValidationError(res, "Email and password required");
        return;
      }

      const { email, password } = parsed.data;

      const doctor = await db
        .select()
        .from(doctorsTable)
        .where(eq(doctorsTable.email, email))
        .limit(1);

      if (!doctor.length || !doctor[0].userId) {
        sendInvalidCredentials(res);
        return;
      }

      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, doctor[0].userId))
        .limit(1);

      if (!user.length) {
        sendInvalidCredentials(res);
        return;
      }

      const passwordHash = (user[0] as any).passwordHash;

      if (!passwordHash) {
        sendInvalidCredentials(res);
        return;
      }

      const validPassword = await verifyPassword(password, passwordHash);

      if (!validPassword) {
        sendInvalidCredentials(res);
        return;
      }

      const userStatus = (user[0] as any).status;
      const doctorStatus = (doctor[0] as any).status;

      if (userStatus && userStatus !== "ACTIVE") {
        res.status(403).json({
          success: false,
          error: {
            code: "ACCOUNT_INACTIVE",
            message: "Doctor user account is not active",
          },
        });
        return;
      }

      if (doctorStatus && doctorStatus !== "ACTIVE") {
        res.status(403).json({
          success: false,
          error: {
            code: "DOCTOR_INACTIVE",
            message: "Doctor profile is not active",
          },
        });
        return;
      }

      const token = signToken({
        userId: doctor[0].userId,
        doctorId: doctor[0].id,
        email: doctor[0].email,
        fullName: doctor[0].fullName,
        role: "DOCTOR",
      });

      res.cookie(DOCTOR_COOKIE, token, authCookieOptions);

      await writeAudit({
        req,
        actorId: doctor[0].userId,
        actorName: doctor[0].fullName,
        actorRole: "DOCTOR",
        action: "DOCTOR_LOGIN",
        entityType: "Doctor",
        entityId: doctor[0].id,
      });

      res.json({
        success: true,
        data: {
          doctor: {
            id: doctor[0].id,
            userId: doctor[0].userId,
            email: doctor[0].email,
            fullName: doctor[0].fullName,
            specialty: doctor[0].specialty,
            city: doctor[0].city,
            verificationStatus: doctor[0].verificationStatus,
            avatarUrl: doctor[0].avatarUrl,
          },
        },
      });
    } catch (error) {
      console.error("Doctor login error:", error);
      sendInternalError(res);
    }
  },
);

router.get(
  "/auth/doctor/me",
  requireDoctorAuth,
  async (req, res): Promise<void> => {
    try {
      const auth = req.doctorAuth!;

      const doctor = await db
        .select()
        .from(doctorsTable)
        .where(eq(doctorsTable.userId, auth.userId))
        .limit(1);

      if (!doctor.length) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Doctor not found",
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: doctor[0].id,
          userId: doctor[0].userId,
          email: doctor[0].email,
          fullName: doctor[0].fullName,
          specialty: doctor[0].specialty,
          city: doctor[0].city,
          verificationStatus: doctor[0].verificationStatus,
          avatarUrl: doctor[0].avatarUrl,
        },
      });
    } catch (error) {
      console.error("Doctor me error:", error);
      sendInternalError(res);
    }
  },
);

router.post(
  "/auth/doctor/logout",
  requireDoctorAuth,
  async (req, res): Promise<void> => {
    try {
      res.clearCookie(DOCTOR_COOKIE, clearAuthCookieOptions);

      if (req.doctorAuth) {
        await writeAudit({
          req,
          actorId: req.doctorAuth.userId,
          actorName: req.doctorAuth.fullName ?? "Unknown",
          actorRole: "DOCTOR",
          action: "DOCTOR_LOGOUT",
          entityType: "Doctor",
          entityId: req.doctorAuth.doctorId ?? req.doctorAuth.userId,
        });
      }

      res.json({
        success: true,
        data: {
          message: "Logged out",
        },
      });
    } catch (error) {
      console.error("Doctor logout error:", error);
      sendInternalError(res);
    }
  },
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PATIENT AUTH
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post(
  "/auth/patient/login",
  authRateLimit,
  async (req, res): Promise<void> => {
    try {
      const parsed = parseZod(loginSchema, req.body);

      if (!parsed.success) {
        sendValidationError(res, "Email and password required");
        return;
      }

      const { email, password } = parsed.data;

      const patient = await db
        .select()
        .from(patientsTable)
        .where(eq(patientsTable.email, email))
        .limit(1);

      if (!patient.length || !patient[0].userId) {
        sendInvalidCredentials(res);
        return;
      }

      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, patient[0].userId))
        .limit(1);

      if (!user.length) {
        sendInvalidCredentials(res);
        return;
      }

      const passwordHash = (user[0] as any).passwordHash;

      if (!passwordHash) {
        sendInvalidCredentials(res);
        return;
      }

      const validPassword = await verifyPassword(password, passwordHash);

      if (!validPassword) {
        sendInvalidCredentials(res);
        return;
      }

      const userStatus = (user[0] as any).status;
      const patientStatus = (patient[0] as any).status;

      if (userStatus && userStatus !== "ACTIVE") {
        res.status(403).json({
          success: false,
          error: {
            code: "ACCOUNT_INACTIVE",
            message: "Patient user account is not active",
          },
        });
        return;
      }

      if (patientStatus && patientStatus !== "ACTIVE") {
        res.status(403).json({
          success: false,
          error: {
            code: "PATIENT_INACTIVE",
            message: "Patient profile is not active",
          },
        });
        return;
      }

      const token = signToken({
        userId: patient[0].userId,
        patientId: patient[0].id,
        email: patient[0].email ?? undefined,
        fullName: patient[0].fullName,
        role: "PATIENT",
      });

      res.cookie(PATIENT_COOKIE, token, authCookieOptions);

      await writeAudit({
        req,
        actorId: patient[0].userId,
        actorName: patient[0].fullName,
        actorRole: "PATIENT",
        action: "PATIENT_LOGIN",
        entityType: "Patient",
        entityId: patient[0].id,
      });

      res.json({
        success: true,
        data: {
          patient: {
            id: patient[0].id,
            userId: patient[0].userId,
            email: patient[0].email,
            fullName: patient[0].fullName,
            phone: patient[0].phone,
          },
        },
      });
    } catch (error) {
      console.error("Patient login error:", error);
      sendInternalError(res);
    }
  },
);

router.get(
  "/auth/patient/me",
  requirePatientAuth,
  async (req, res): Promise<void> => {
    try {
      const auth = req.patientAuth!;

      const patient = await db
        .select()
        .from(patientsTable)
        .where(eq(patientsTable.userId, auth.userId))
        .limit(1);

      if (!patient.length) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Patient not found",
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: patient[0].id,
          userId: patient[0].userId,
          email: patient[0].email,
          fullName: patient[0].fullName,
          phone: patient[0].phone,
        },
      });
    } catch (error) {
      console.error("Patient me error:", error);
      sendInternalError(res);
    }
  },
);

router.post(
  "/auth/patient/logout",
  requirePatientAuth,
  async (req, res): Promise<void> => {
    try {
      res.clearCookie(PATIENT_COOKIE, clearAuthCookieOptions);

      if (req.patientAuth) {
        await writeAudit({
          req,
          actorId: req.patientAuth.userId,
          actorName: req.patientAuth.fullName ?? "Unknown",
          actorRole: "PATIENT",
          action: "PATIENT_LOGOUT",
          entityType: "Patient",
          entityId: req.patientAuth.patientId ?? req.patientAuth.userId,
        });
      }

      res.json({
        success: true,
        data: {
          message: "Logged out",
        },
      });
    } catch (error) {
      console.error("Patient logout error:", error);
      sendInternalError(res);
    }
  },
);

router.post(
  "/auth/patient/register",
  authRateLimit,
  async (req, res): Promise<void> => {
    try {
      const parsed = parseZod(patientRegisterSchema, req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Full name, valid email, phone and password are required",
        );
        return;
      }

      const { fullName, email, phone, password } = parsed.data;

      if (!isStrongPassword(password)) {
        res.status(400).json({
          success: false,
          error: {
            code: "WEAK_PASSWORD",
            message:
              "Password must be at least 8 characters and include uppercase, lowercase and number",
          },
        });
        return;
      }

      const existing = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (existing.length) {
        res.status(409).json({
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "An account with this email already exists",
          },
        });
        return;
      }

      const passwordHash = await hashPassword(password);

      const { newUser, newPatient } = await db.transaction(async (tx) => {
        const [createdUser] = await tx
          .insert(usersTable)
          .values({
            email,
            fullName,
            passwordHash,
            role: "PATIENT",
            status: "ACTIVE",
            phone,
          })
          .returning();

        const [createdPatient] = await tx
          .insert(patientsTable)
          .values({
            userId: createdUser.id,
            fullName,
            email,
            phone,
            status: "ACTIVE",
          })
          .returning();

        return {
          newUser: createdUser,
          newPatient: createdPatient,
        };
      });

      const token = signToken({
        userId: newUser.id,
        patientId: newPatient.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: "PATIENT",
      });

      res.cookie(PATIENT_COOKIE, token, authCookieOptions);

      await writeAudit({
        req,
        actorId: newUser.id,
        actorName: newUser.fullName,
        actorRole: "PATIENT",
        action: "PATIENT_REGISTER",
        entityType: "Patient",
        entityId: newPatient.id,
      });

      res.status(201).json({
        success: true,
        data: {
          patient: {
            id: newPatient.id,
            userId: newPatient.userId,
            email: newPatient.email,
            fullName: newPatient.fullName,
            phone: newPatient.phone,
          },
        },
      });
    } catch (error) {
      console.error("Patient register error:", error);
      sendInternalError(res);
    }
  },
);

export default router;

// new updated gpt code is above

