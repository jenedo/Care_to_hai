import bcrypt from "bcryptjs";
import { db, pool } from "./lib/db";
import {
  usersTable, adminUsersTable, doctorsTable, doctorVerificationsTable,
  patientsTable, appointmentsTable, paymentsTable, refundsTable,
  doctorPayoutsTable, supportTicketsTable, ticketRepliesTable,
  reviewsTable, clinicsTable, notificationsTable,
  subscriptionPlansTable, patientSubscriptionsTable,
} from "./lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.execute(sql`
    TRUNCATE TABLE notifications, audit_logs, ticket_replies, support_tickets,
    reviews, doctor_payouts, refunds, payments, appointments,
    doctor_clinics, clinics, patient_subscriptions, subscription_plans,
    patients, doctor_verifications, doctors,
    admin_users, users
    RESTART IDENTITY CASCADE
  `);
  console.log("✓ Cleared existing data");

  // ── ADMIN USERS ───────────────────────────────────────────────────────────
  const adminPassHash = await bcrypt.hash("SahatGhar@2025!", 12);

  const adminData = [
    { email: "superadmin@sahatghar.pk", fullName: "Ayesha Malik", role: "SUPER_ADMIN" as const },
    { email: "admin@sahatghar.pk", fullName: "Usman Khan", role: "ADMIN" as const },
    { email: "finance@sahatghar.pk", fullName: "Sana Iman", role: "FINANCE" as const },
    { email: "support@sahatghar.pk", fullName: "Bilal Ahmed", role: "SUPPORT" as const },
    { email: "verifier@sahatghar.pk", fullName: "Hina Fatima", role: "VERIFICATION_OFFICER" as const },
  ];

  for (const a of adminData) {
    const user = await db.insert(usersTable).values({ email: a.email, fullName: a.fullName, passwordHash: adminPassHash, role: "ADMIN", status: "ACTIVE" }).returning();
    await db.insert(adminUsersTable).values({ userId: user[0].id, role: a.role, isActive: true });
  }
  console.log("✓ Created 5 admin users (password: SahatGhar@2025!)");

  // ── CLINICS ───────────────────────────────────────────────────────────────
  const clinicRows = await db.insert(clinicsTable).values([
    { name: "Shaukat Khanum Cancer Hospital", phone: "042-35905000", address: "7-A, Block R-3, M.A. Johar Town", city: "Lahore", area: "Johar Town", status: "ACTIVE" },
    { name: "Aga Khan University Hospital", phone: "021-34864864", address: "Stadium Road", city: "Karachi", area: "Stadium Road", status: "ACTIVE" },
    { name: "PIMS Hospital", phone: "051-9261170", address: "G-8/3, Islamabad", city: "Islamabad", area: "G-8", status: "ACTIVE" },
    { name: "Doctors Hospital", phone: "042-37479924", address: "152-G, Canal Bank Road", city: "Lahore", area: "Gulberg", status: "ACTIVE" },
    { name: "Liaquat National Hospital", phone: "021-34412360", address: "Karachi National Highway", city: "Karachi", area: "Karachi East", status: "ACTIVE" },
  ]).returning();
  console.log("✓ Created 5 clinics");

  // ── DOCTORS ───────────────────────────────────────────────────────────────
  const docPassHash = await bcrypt.hash("Doctor@2025!", 12);
  const doctorData = [
    { fullName: "Dr. Ayesha Noor", email: "ayesha.noor@sahatghar.pk", specialty: "Cardiology", city: "Lahore", pmdcNumber: "79484-P", verificationStatus: "VERIFIED" as const, fee: "1500", rating: "4.8", appts: 156, featured: true },
    { fullName: "Dr. Usman Tariq", email: "usman.tariq@sahatghar.pk", specialty: "General Medicine", city: "Karachi", pmdcNumber: "454321-P", verificationStatus: "PENDING" as const, fee: "800", rating: null, appts: 0, featured: false },
    { fullName: "Dr. Hina Fatima", email: "hina.fatima@sahatghar.pk", specialty: "Dermatology", city: "Islamabad", pmdcNumber: "112233-P", verificationStatus: "IN_REVIEW" as const, fee: "1200", rating: null, appts: 0, featured: false },
    { fullName: "Dr. Bilal Ahmad", email: "bilal.ahmad@sahatghar.pk", specialty: "Orthopedics", city: "Rawalpindi", pmdcNumber: "334400-P", verificationStatus: "VERIFIED" as const, fee: "2000", rating: "4.6", appts: 89, featured: false },
    { fullName: "Dr. Sana Khan", email: "sana.khan@sahatghar.pk", specialty: "Pediatrics", city: "Multan", pmdcNumber: "556677-P", verificationStatus: "VERIFIED" as const, fee: "1000", rating: "4.7", appts: 203, featured: true },
    { fullName: "Dr. Farhan Malik", email: "farhan.malik@sahatghar.pk", specialty: "ENT", city: "Peshawar", pmdcNumber: "667788-P", verificationStatus: "VERIFIED" as const, fee: "1300", rating: "4.5", appts: 134, featured: false },
    { fullName: "Dr. Maryam Siddiqui", email: "maryam.siddiqui@sahatghar.pk", specialty: "Gynecology", city: "Lahore", pmdcNumber: "778899-P", verificationStatus: "SUSPENDED" as const, fee: "1500", rating: "3.2", appts: 45, featured: false },
    { fullName: "Dr. Hassan Malik", email: "hassan.malik@sahatghar.pk", specialty: "Neurology", city: "Karachi", pmdcNumber: "889900-P", verificationStatus: "PENDING" as const, fee: "2500", rating: null, appts: 0, featured: false },
    { fullName: "Dr. Faisal Mahmood", email: "faisal.mahmood@sahatghar.pk", specialty: "General Medicine", city: "Lahore", pmdcNumber: "990011-P", verificationStatus: "VERIFIED" as const, fee: "900", rating: "4.9", appts: 312, featured: true },
    { fullName: "Dr. Fatima Noor", email: "fatima.noor@sahatghar.pk", specialty: "Psychiatry", city: "Islamabad", pmdcNumber: "112244-P", verificationStatus: "VERIFIED" as const, fee: "1800", rating: "4.7", appts: 178, featured: false },
    { fullName: "Dr. Ahmed Raza", email: "ahmed.raza@sahatghar.pk", specialty: "Cardiology", city: "Karachi", pmdcNumber: "223355-P", verificationStatus: "VERIFIED" as const, fee: "1500", rating: "4.8", appts: 95, featured: false },
    { fullName: "Dr. Zainab Hassan", email: "zainab.hassan@sahatghar.pk", specialty: "Ophthalmology", city: "Lahore", pmdcNumber: "445566-P", verificationStatus: "PENDING" as const, fee: "1100", rating: null, appts: 0, featured: false },
    { fullName: "Dr. Omar Khalid", email: "omar.khalid@sahatghar.pk", specialty: "Urology", city: "Karachi", pmdcNumber: "556699-P", verificationStatus: "VERIFIED" as const, fee: "2200", rating: "4.6", appts: 67, featured: false },
    { fullName: "Dr. Sara Imran", email: "sara.imran@sahatghar.pk", specialty: "Endocrinology", city: "Islamabad", pmdcNumber: "667711-P", verificationStatus: "IN_REVIEW" as const, fee: "1700", rating: null, appts: 0, featured: false },
    { fullName: "Dr. Kamran Shah", email: "kamran.shah@sahatghar.pk", specialty: "Gastroenterology", city: "Lahore", pmdcNumber: "778822-P", verificationStatus: "VERIFIED" as const, fee: "1900", rating: "4.4", appts: 112, featured: false },
    { fullName: "Dr. Nadia Qureshi", email: "nadia.qureshi@sahatghar.pk", specialty: "Rheumatology", city: "Karachi", pmdcNumber: "889933-P", verificationStatus: "REJECTED" as const, fee: "1600", rating: null, appts: 0, featured: false },
    { fullName: "Dr. Tariq Mahmood", email: "tariq.mahmood@sahatghar.pk", specialty: "Pulmonology", city: "Peshawar", pmdcNumber: "990044-P", verificationStatus: "VERIFIED" as const, fee: "1400", rating: "4.5", appts: 88, featured: false },
    { fullName: "Dr. Rabia Akhtar", email: "rabia.akhtar@sahatghar.pk", specialty: "Nephrology", city: "Multan", pmdcNumber: "112255-P", verificationStatus: "PENDING" as const, fee: "2100", rating: null, appts: 0, featured: false },
    { fullName: "Dr. Imran Baig", email: "imran.baig@sahatghar.pk", specialty: "Oncology", city: "Lahore", pmdcNumber: "223366-P", verificationStatus: "VERIFIED" as const, fee: "3000", rating: "4.9", appts: 54, featured: true },
    { fullName: "Dr. Asma Shahid", email: "asma.shahid@sahatghar.pk", specialty: "Allergy & Immunology", city: "Islamabad", pmdcNumber: "334477-P", verificationStatus: "VERIFIED" as const, fee: "1300", rating: "4.6", appts: 143, featured: false },
  ];

  const doctorRows = [];
  for (const d of doctorData) {
    const userRow = await db.insert(usersTable).values({ email: d.email, fullName: d.fullName, passwordHash: docPassHash, role: "DOCTOR", status: "ACTIVE" }).returning();
    const docRow = await db.insert(doctorsTable).values({
      userId: userRow[0].id, fullName: d.fullName, email: d.email, specialty: d.specialty, city: d.city,
      pmdcNumber: d.pmdcNumber, verificationStatus: d.verificationStatus, consultationFee: d.fee,
      rating: d.rating, appointmentsCompleted: d.appts, isFeatured: d.featured,
      isAvailableOnline: d.verificationStatus === "VERIFIED", qualifications: ["MBBS"],
    }).returning();
    doctorRows.push(docRow[0]);
    if (["PENDING", "IN_REVIEW", "VERIFIED"].includes(d.verificationStatus)) {
      await db.insert(doctorVerificationsTable).values({ doctorId: docRow[0].id, pmdcNumber: d.pmdcNumber, status: d.verificationStatus as any });
    }
  }
  console.log("✓ Created 20 doctors");

  // ── PATIENTS ─────────────────────────────────────────────────────────────
  const patientNames = [
    "Ayesha Khan", "Muhammad Ali", "Sara Imran", "Usman Javed", "Fatima Noor",
    "Hamza Hassan", "Zainab Malik", "Ahmed Sheikh", "Mohsin Tariq", "Sana Ahmed",
    "Raza Shah", "Maryam Iqbal", "Tariq Butt", "Nadia Hussain", "Bilal Chaudhry",
    "Amna Rizvi", "Khalid Mehmood", "Hira Baig", "Faisal Qureshi", "Naila Siddiqui",
    "Waqas Anwar", "Farah Zaman", "Asif Raza", "Lubna Malik", "Adnan Sheikh",
    "Sobia Tariq", "Irfan Baig", "Komal Hassan", "Zeeshan Ahmed", "Saira Akhtar",
    "Nasir Mahmood", "Parveen Gul", "Shahid Iqbal", "Rukhsana Khan", "Imtiaz Ahmed",
    "Tahira Bibi", "Majid Hussain", "Fareeda Begum", "Shafiq Ahmed", "Nargis Anjum",
    "Abrar Ghani", "Sumaira Bibi", "Saeed Gul", "Shaista Awan", "Kamran Malik",
    "Mariam Akhtar", "Haroon Raza", "Rubina Iqbal", "Naeem Anwar", "Uzma Shah",
  ];
  const cities = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Multan", "Peshawar", "Faisalabad", "Quetta"];
  const genders = ["MALE", "FEMALE"];

  const patientRows = [];
  for (let i = 0; i < patientNames.length; i++) {
    const name = patientNames[i];
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`;
    const userRow = await db.insert(usersTable).values({ email, fullName: name, passwordHash: docPassHash, role: "PATIENT", status: "ACTIVE" }).returning();
    const patRow = await db.insert(patientsTable).values({
      userId: userRow[0].id, fullName: name, email,
      phone: `+92-3${String(Math.floor(100000000 + Math.random() * 900000000))}`,
      gender: genders[i % 2], city: cities[i % cities.length], status: "ACTIVE",
      dateOfBirth: `${1970 + (i % 40)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    }).returning();
    patientRows.push(patRow[0]);
  }
  console.log("✓ Created 50 patients");

  // ── APPOINTMENTS ─────────────────────────────────────────────────────────
  const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED", "NO_SHOW", "CONFIRMED", "HELD"] as const;
  const aptRows = [];
  for (let i = 0; i < 100; i++) {
    const doc = doctorRows[i % doctorRows.length];
    const pat = patientRows[i % patientRows.length];
    const daysAgo = Math.floor(Math.random() * 60) - 5;
    const aptDate = new Date(Date.now() - daysAgo * 86400000);
    const status = statuses[i % statuses.length];
    const fee = parseFloat(doc.consultationFee ?? "1000");
    const commission = fee * 0.1;
    const aptRow = await db.insert(appointmentsTable).values({
      patientId: pat.id, patientName: pat.fullName, patientPhone: pat.phone,
      patientAge: `${25 + (i % 40)}`, patientGender: i % 2 === 0 ? "Male" : "Female",
      doctorId: doc.id, doctorName: doc.fullName, doctorSpecialty: doc.specialty,
      appointmentDate: aptDate, startTime: "10:00", endTime: "10:30",
      consultationType: "ONLINE", status, paymentStatus: status === "COMPLETED" ? "PAID" : "PENDING",
      fee: String(fee), platformCommission: String(commission), doctorEarning: String(fee - commission),
      city: doc.city,
    }).returning();
    aptRows.push(aptRow[0]);

    // Payment for completed appointments
    if (status === "COMPLETED") {
      await db.insert(paymentsTable).values({
        appointmentId: aptRow[0].id, patientId: pat.id, patientName: pat.fullName,
        doctorId: doc.id, doctorName: doc.fullName,
        amount: String(fee),
        method: (["JAZZCASH", "EASYPAISA", "RAAST", "CARD", "CASH"] as const)[i % 5],
        status: "PAID", transactionRef: `TXN-${Date.now()}-${i}`,
      });
    }
  }
  console.log("✓ Created 100 appointments + payments");

  // ── REFUNDS ───────────────────────────────────────────────────────────────
  const cancelledApts = aptRows.filter(a => a.status === "CANCELLED" || a.status === "NO_SHOW").slice(0, 10);
  for (let i = 0; i < cancelledApts.length; i++) {
    const apt = cancelledApts[i];
    await db.insert(refundsTable).values({
      appointmentId: apt.id, amount: apt.fee ?? "1000",
      reason: i % 2 === 0 ? "Doctor unavailable" : "Patient requested cancellation",
      status: (["REQUESTED", "APPROVED", "PROCESSED", "REJECTED"] as const)[i % 4],
      requestedBy: apt.patientId, requestedByName: apt.patientName,
    });
  }
  console.log("✓ Created refunds");

  // ── PAYOUTS ───────────────────────────────────────────────────────────────
  const verifiedDocs = doctorRows.filter(d => d.verificationStatus === "VERIFIED").slice(0, 10);
  for (let i = 0; i < verifiedDocs.length; i++) {
    const doc = verifiedDocs[i];
    await db.insert(doctorPayoutsTable).values({
      doctorId: doc.id, doctorName: doc.fullName,
      amount: String(10000 + i * 5000),
      status: (["PENDING", "APPROVED", "PAID", "REJECTED"] as const)[i % 4],
      bankName: ["HBL", "MCB", "UBL", "Meezan", "Standard Chartered"][i % 5],
      accountTitle: doc.fullName,
      accountNumber: `01234567${String(i).padStart(3, "0")}`,
      iban: `PK36HABB0000000${i}23456789`,
    });
  }
  console.log("✓ Created payouts");

  // ── SUPPORT TICKETS ───────────────────────────────────────────────────────
  const ticketSubjects = [
    "Cannot access appointment", "Refund not received", "Doctor was late",
    "Payment failed but money deducted", "Cannot reschedule appointment",
    "Login issue", "Cannot view prescription", "App crashes on iOS",
  ];
  const ticketRows = [];
  for (let i = 0; i < 15; i++) {
    const pat = patientRows[i % patientRows.length];
    const tRow = await db.insert(supportTicketsTable).values({
      userId: pat.id, userName: pat.fullName, userEmail: pat.email, userRole: "PATIENT",
      subject: ticketSubjects[i % ticketSubjects.length],
      description: `Issue reported by ${pat.fullName}: ${ticketSubjects[i % ticketSubjects.length]}`,
      category: (["APPOINTMENT", "BILLING", "TECHNICAL", "GENERAL"] as const)[i % 4],
      priority: (["LOW", "MEDIUM", "HIGH", "URGENT"] as const)[i % 4],
      status: (["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const)[i % 4],
    }).returning();
    ticketRows.push(tRow[0]);
  }
  console.log("✓ Created 15 support tickets");

  // ── REVIEWS ───────────────────────────────────────────────────────────────
  const completedApts = aptRows.filter(a => a.status === "COMPLETED").slice(0, 20);
  for (let i = 0; i < completedApts.length; i++) {
    const apt = completedApts[i];
    const rating = 3 + (i % 3);
    await db.insert(reviewsTable).values({
      appointmentId: apt.id, patientId: apt.patientId, patientName: apt.patientName,
      doctorId: apt.doctorId, doctorName: apt.doctorName,
      rating, comment: ["Excellent doctor!", "Good experience", "Very helpful"][i % 3],
      status: (["PUBLISHED", "PUBLISHED", "PENDING", "REPORTED"] as const)[i % 4],
    });
  }
  console.log("✓ Created reviews");

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  const adminUser = await db.select().from(usersTable).limit(1);
  if (adminUser.length) {
    await db.insert(notificationsTable).values([
      { userId: adminUser[0].id, title: "New Doctor Registered", message: "Dr. Hassan Malik has submitted verification documents.", type: "VERIFICATION", channel: "IN_APP", status: "PENDING" },
      { userId: adminUser[0].id, title: "Refund Request", message: "A patient has requested a refund for a cancelled appointment.", type: "PAYMENT", channel: "IN_APP", status: "PENDING" },
      { userId: adminUser[0].id, title: "High Priority Ticket", message: "A support ticket has been escalated to high priority.", type: "SUPPORT", channel: "IN_APP", status: "READ" },
      { userId: "admin", title: "System: DB Seeded", message: "Database has been seeded with test data.", type: "SYSTEM", channel: "IN_APP", status: "PENDING" },
    ]);
  }
  console.log("✓ Created notifications");

  // ── SUBSCRIPTION PLANS ────────────────────────────────────────────────────
  const planRows = await db.insert(subscriptionPlansTable).values([
    {
      name: "Free",
      price: "0",
      billingCycle: "monthly",
      features: { video_consults: 0, lab_tests: 0, priority_appointments: 0, family_members: 1, health_locker_storage: "100 MB", dedicated_support: false },
      isActive: true,
    },
    {
      name: "Basic",
      price: "1499",
      billingCycle: "monthly",
      features: { video_consults: 4, lab_tests: 10, priority_appointments: 1, family_members: 2, health_locker_storage: "1 GB", dedicated_support: false },
      isActive: true,
    },
    {
      name: "Standard",
      price: "2999",
      billingCycle: "monthly",
      features: { video_consults: 10, lab_tests: 20, priority_appointments: 2, family_members: 3, health_locker_storage: "20 GB", dedicated_support: true },
      isActive: true,
    },
    {
      name: "Family",
      price: "4999",
      billingCycle: "monthly",
      features: { video_consults: "Unlimited", lab_tests: "Unlimited", priority_appointments: "Unlimited", family_members: "Up to 6", health_locker_storage: "50 GB", dedicated_support: true },
      isActive: true,
    },
  ]).returning();

  // Assign subscriptions to patients
  const planAssignment = [
    { planIdx: 0, count: 20 },  // 20 on Free
    { planIdx: 1, count: 15 },  // 15 on Basic
    { planIdx: 2, count: 10 },  // 10 on Standard
    { planIdx: 3, count: 5 },   //  5 on Family
  ];

  let patientOffset = 0;
  for (const { planIdx, count } of planAssignment) {
    const plan = planRows[planIdx];
    for (let i = 0; i < count && patientOffset < patientRows.length; i++, patientOffset++) {
      const pat = patientRows[patientOffset];
      const startDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);
      const endDate = new Date(startDate.getTime() + 30 * 86400000);
      const status = i < count - 2 ? "ACTIVE" : (i === count - 2 ? "CANCELLED" : "EXPIRED");
      await db.insert(patientSubscriptionsTable).values({
        patientId: pat.id,
        patientName: pat.fullName,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        status: status as any,
        startDate,
        endDate,
      });
    }
  }
  console.log("✓ Created subscription plans + 50 patient subscriptions");

  console.log("\n✅ Seed complete! Login credentials:");
  console.log("   Super Admin: superadmin@sahatghar.pk / SahatGhar@2025!");
  console.log("   Admin:       admin@sahatghar.pk / SahatGhar@2025!");
  console.log("   Finance:     finance@sahatghar.pk / SahatGhar@2025!");
  console.log("   Support:     support@sahatghar.pk / SahatGhar@2025!");
  console.log("   Verifier:    verifier@sahatghar.pk / SahatGhar@2025!");
  console.log("   Doctor:      ayesha.noor@sahatghar.pk / Doctor@2025!");

  await pool.end();
}

main().catch(err => { console.error("Seed failed:", err); process.exit(1); });
