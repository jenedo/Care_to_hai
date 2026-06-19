/**
 * Create Clerk test users matching database seed credentials.
 * Run after: pnpm --filter @asaancare/api-server run seed
 *
 * Usage (from platform/):
 *   node --env-file=artifacts/api-server/.env scripts/seed-clerk-users.mjs
 */
const CLERK_SECRET = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET) {
  console.error("Missing CLERK_SECRET_KEY — set it in artifacts/api-server/.env");
  process.exit(1);
}

const TEST_USERS = [
  {
    email: "superadmin@asaancare.pk",
    password: "AsaanCare@2025!",
    firstName: "Ayesha",
    lastName: "Malik",
  },
  {
    email: "admin@asaancare.pk",
    password: "AsaanCare@2025!",
    firstName: "Usman",
    lastName: "Khan",
  },
  {
    email: "ayesha.noor@asaancare.pk",
    password: "Doctor@2025!",
    firstName: "Ayesha",
    lastName: "Noor",
  },
  {
    email: "ayesha.khan@gmail.com",
    password: "Patient@2025!",
    firstName: "Ayesha",
    lastName: "Khan",
  },
];

async function findUserByEmail(email) {
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${CLERK_SECRET}` } },
  );
  if (!res.ok) {
    throw new Error(`Clerk lookup failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json?.[0] ?? null;
}

async function createUser(user) {
  const res = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [user.email],
      password: user.password,
      first_name: user.firstName,
      last_name: user.lastName,
      skip_password_checks: true,
      skip_password_requirement: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`Create failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  console.log("Creating Clerk test users...\n");

  for (const user of TEST_USERS) {
    const existing = await findUserByEmail(user.email);
    if (existing) {
      console.log(`✓ Already exists: ${user.email}`);
      continue;
    }

    await createUser(user);
    console.log(`✓ Created: ${user.email} / ${user.password}`);
  }

  console.log("\nDone. Test logins:");
  console.log("  Admin:   superadmin@asaancare.pk / AsaanCare@2025!");
  console.log("  Doctor:  ayesha.noor@asaancare.pk / Doctor@2025!");
  console.log("  Patient: ayesha.khan@gmail.com / Patient@2025!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
