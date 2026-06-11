import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL must be set.");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const plans = [
  {
    name: "Asaan Basic",
    price: "599.00",
    billingCycle: "monthly",
    features: {
      planTier: "BASIC",
      familyMemberLimit: 3,
      videoCredits: 1,
      audioCredits: 1,
      chatCredits: 2,
      chatSessionSeconds: 120,
      allowedDoctorTiers: ["BASIC"],
      topUpAllowed: true,
      launchPrice: 599,
      normalPrice: 699,
      doctorPayoutDefaults: {
        video: 300,
        audio: 120,
        chat: 40
      },
      description: "Low-cost family plan for basic/general doctors."
    }
  },
  {
    name: "Asaan Standard",
    price: "999.00",
    billingCycle: "monthly",
    features: {
      planTier: "STANDARD",
      familyMemberLimit: 5,
      videoCredits: 2,
      audioCredits: 2,
      chatCredits: 5,
      chatSessionSeconds: 120,
      allowedDoctorTiers: ["BASIC", "STANDARD"],
      topUpAllowed: true,
      doctorPayoutDefaults: {
        video: 320,
        audio: 150,
        chat: 50
      },
      description: "Family plan with more credits and selected standard doctors."
    }
  },
  {
    name: "Asaan Premium",
    price: "1499.00",
    billingCycle: "monthly",
    features: {
      planTier: "PREMIUM",
      familyMemberLimit: 7,
      videoCredits: 4,
      audioCredits: 4,
      chatCredits: 10,
      chatSessionSeconds: 180,
      allowedDoctorTiers: ["BASIC", "STANDARD", "PREMIUM"],
      topUpAllowed: true,
      doctorPayoutDefaults: {
        video: 350,
        audio: 180,
        chat: 60
      },
      description: "Higher family limit, more credits, and selected premium doctors."
    }
  }
];

async function upsertPlan(client, plan) {
  const existing = await client.query(
    `SELECT id FROM subscription_plans WHERE lower(name) = lower($1) LIMIT 1`,
    [plan.name],
  );

  if (existing.rowCount > 0) {
    const id = existing.rows[0].id;

    await client.query(
      `
      UPDATE subscription_plans
      SET
        price = $2,
        billing_cycle = $3,
        features = $4::jsonb,
        is_active = true,
        updated_at = now()
      WHERE id = $1
      `,
      [id, plan.price, plan.billingCycle, JSON.stringify(plan.features)],
    );

    return { action: "updated", id, name: plan.name };
  }

  const id = randomUUID();

  const inserted = await client.query(
    `
    INSERT INTO subscription_plans (
      id,
      name,
      price,
      billing_cycle,
      features,
      is_active,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, true, now(), now())
    RETURNING id
    `,
    [id, plan.name, plan.price, plan.billingCycle, JSON.stringify(plan.features)],
  );

  return { action: "created", id: inserted.rows[0].id, name: plan.name };
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const results = [];

    for (const plan of plans) {
      results.push(await upsertPlan(client, plan));
    }

    await client.query("COMMIT");

    console.log("Subscription plans upserted safely:");
    for (const result of results) {
      console.log(`- ${result.action}: ${result.name} (${result.id})`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
