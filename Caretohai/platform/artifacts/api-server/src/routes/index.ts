import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";

/* Mobile-facing routes — MUST come before any admin router that uses router.use(requireAuth) */
import doctorStatusRouter from "./doctorStatus";
import doctorProfileRouter from "./doctorProfile";
import doctorAvailabilitySyncRouter from "./doctorAvailabilitySync";
import doctorEarningsRouter from "./doctorEarnings";
import doctorNotificationsRouter from "./doctorNotifications";
import patientProfileRouter from "./patientProfile";
import consultationsRouter from "./consultations";
import subscriptionUsageRouter from "./subscriptionUsage";
import publicPlansRouter from "./publicPlans";
import agoraRouter from "./agora";
import prescriptionsRouter from "./prescriptions";
import mobileAuthRouter from "./mobileAuth";

/* Admin-only routes */
import dashboardRouter from "./dashboard";
import doctorsRouter from "./doctors";
import patientsRouter from "./patients";
import appointmentsRouter from "./appointments";
import paymentsRouter from "./payments";
import refundsRouter from "./refunds";
import payoutsRouter from "./payouts";
import reviewsRouter from "./reviews";
import clinicsRouter from "./clinics";
import subscriptionsRouter from "./subscriptions";
import supportRouter from "./support";
import auditRouter from "./audit";
import adminUsersRouter from "./adminUsers";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

/* Public */
router.use(healthRouter);
router.use(authRouter);

/* Public routes — no auth required */
router.use(publicPlansRouter);

/* Mobile auth (Supabase OTP) — placed before all other routes */
router.use(mobileAuthRouter);

/* Mobile-facing (doctor / patient auth) — placed before all admin routers */
router.use(doctorStatusRouter);
router.use(doctorProfileRouter);
router.use(doctorAvailabilitySyncRouter);
router.use(doctorEarningsRouter);
router.use(doctorNotificationsRouter);
router.use(patientProfileRouter);
router.use(consultationsRouter);
router.use(subscriptionUsageRouter);
router.use(agoraRouter);
router.use(prescriptionsRouter);

/* Admin-only */
router.use(dashboardRouter);
router.use(doctorsRouter);
router.use(patientsRouter);
router.use(appointmentsRouter);
router.use(paymentsRouter);
router.use(refundsRouter);
router.use(payoutsRouter);
router.use(reviewsRouter);
router.use(clinicsRouter);
router.use(subscriptionsRouter);
router.use(supportRouter);
router.use(auditRouter);
router.use(adminUsersRouter);
router.use(notificationsRouter);

export default router;
