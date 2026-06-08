import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
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

router.use(healthRouter);
router.use(authRouter);
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
