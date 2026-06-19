import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  appointmentsTable,
  doctorPayoutsTable,
  doctorsTable,
  consultationSessionsTable,
} from "../lib/db";
import { requireDoctorAuth } from "../middlewares/auth";

const router = Router();

router.get("/doctor/earnings", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedApts = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.doctorId, doctorId), eq(appointmentsTable.status, "COMPLETED")));

    const completedSessions = await db
      .select()
      .from(consultationSessionsTable)
      .where(and(eq(consultationSessionsTable.doctorId, doctorId), eq(consultationSessionsTable.status, "COMPLETED")));

    const aptEarnings = (list: typeof completedApts) =>
      list.reduce((acc, a) => acc + Number(a.doctorEarning ?? a.fee ?? 0), 0);

    const sessionEarnings = (list: typeof completedSessions) =>
      list.filter(s => s.isPaid).reduce((acc, s) => acc + Number(s.paymentAmount ?? 0), 0);

    const todayApts = completedApts.filter(a => a.appointmentDate >= todayStart);
    const weekApts = completedApts.filter(a => a.appointmentDate >= weekStart);
    const monthApts = completedApts.filter(a => a.appointmentDate >= monthStart);

    const todaySessions = completedSessions.filter(s => s.endedAt && s.endedAt >= todayStart);
    const weekSessions = completedSessions.filter(s => s.endedAt && s.endedAt >= weekStart);
    const monthSessions = completedSessions.filter(s => s.endedAt && s.endedAt >= monthStart);

    const totalEarned = aptEarnings(completedApts) + sessionEarnings(completedSessions);

    const paidPayouts = await db
      .select()
      .from(doctorPayoutsTable)
      .where(and(eq(doctorPayoutsTable.doctorId, doctorId), eq(doctorPayoutsTable.status, "PAID")));

    const totalPaidOut = paidPayouts.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);

    const pendingPayouts = await db
      .select()
      .from(doctorPayoutsTable)
      .where(and(eq(doctorPayoutsTable.doctorId, doctorId), eq(doctorPayoutsTable.status, "PENDING")))
      .orderBy(desc(doctorPayoutsTable.requestedAt))
      .limit(5);

    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));

    res.json({
      data: {
        today: aptEarnings(todayApts) + sessionEarnings(todaySessions),
        week: aptEarnings(weekApts) + sessionEarnings(weekSessions),
        month: aptEarnings(monthApts) + sessionEarnings(monthSessions),
        total: totalEarned,
        available_balance: Math.max(0, totalEarned - totalPaidOut),
        rating: doctor?.rating ? Number(doctor.rating) : null,
        total_reviews: doctor?.totalReviews ?? 0,
        appointments_completed: completedApts.length,
        pending_payouts: pendingPayouts.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          status: p.status,
          requested_at: p.requestedAt,
          wallet_provider: p.walletProvider,
          wallet_number: p.walletNumber,
          bank_name: p.bankName,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

router.post("/doctor/payout-request", requireDoctorAuth, async (req, res): Promise<void> => {
  const doctorId = (req as any).doctorAuth.doctorId;
  const { amount, walletProvider, walletNumber, bankName, accountTitle, accountNumber, iban } = req.body;

  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }

  try {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));
    if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }

    const [payout] = await db
      .insert(doctorPayoutsTable)
      .values({
        doctorId,
        doctorName: doctor.fullName,
        amount: String(amount),
        status: "PENDING",
        walletProvider: walletProvider ?? null,
        walletNumber: walletNumber ?? null,
        bankName: bankName ?? null,
        accountTitle: accountTitle ?? null,
        accountNumber: accountNumber ?? null,
        iban: iban ?? null,
      })
      .returning();

    res.status(201).json({ data: payout });
  } catch {
    res.status(500).json({ error: "Failed to submit payout request" });
  }
});

export default router;
