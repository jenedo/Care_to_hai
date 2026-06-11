import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or NEON_DATABASE_URL must be set.");
}

const configPath = process.env.DOCTOR_PLAN_POOL_FILE
  ? path.resolve(process.env.DOCTOR_PLAN_POOL_FILE)
  : path.resolve("./scripts/doctor-plan-pool.local.json");

const PLAN_TIERS = new Set(["BASIC", "STANDARD", "PREMIUM"]);
const SERVICE_TYPES = new Set(["VIDEO", "AUDIO", "CHAT"]);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function assertString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function assertPlanTier(value) {
  const tier = assertString(value, "planTier").toUpperCase();

  if (!PLAN_TIERS.has(tier)) {
    throw new Error(`Invalid planTier: ${value}`);
  }

  return tier;
}

function assertServiceType(value) {
  const serviceType = assertString(value, "serviceType").toUpperCase();

  if (!SERVICE_TYPES.has(serviceType)) {
    throw new Error(`Invalid serviceType: ${value}`);
  }

  return serviceType;
}

function assertMoney(value, fieldName) {
  const amount = Number.parseFloat(String(value));

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${fieldName} must be a non-negative amount`);
  }

  return amount.toFixed(2);
}

function assertPositiveInt(value, fieldName) {
  const n = Number(value);

  if (!Number.isInteger(n) || n < 1 || n > 200) {
    throw new Error(`${fieldName} must be an integer from 1 to 200`);
  }

  return n;
}

async function readConfig() {
  const raw = await fs.readFile(configPath, "utf8");
  const clean = raw.replace(/^\uFEFF/, "");
  const parsed = JSON.parse(clean);

  if (!Array.isArray(parsed)) {
    throw new Error("Doctor pool config must be an array");
  }

  return parsed;
}

async function assertDoctorExists(client, doctorId) {
  const result = await client.query(
    `SELECT id, full_name, verification_status FROM doctors WHERE id = $1 LIMIT 1`,
    [doctorId],
  );

  if (result.rowCount === 0) {
    throw new Error(`Doctor not found: ${doctorId}`);
  }

  const doctor = result.rows[0];

  if (doctor.verification_status !== "VERIFIED") {
    throw new Error(`Doctor is not VERIFIED: ${doctor.full_name} (${doctorId})`);
  }

  return doctor;
}

async function upsertPoolRow(client, row) {
  const doctorId = assertString(row.doctorId, "doctorId");

  if (doctorId === "PASTE_DOCTOR_ID_HERE") {
    throw new Error("Replace PASTE_DOCTOR_ID_HERE with a real verified doctor id.");
  }

  const planTier = assertPlanTier(row.planTier);

  await assertDoctorExists(client, doctorId);

  const services = row.services;

  if (!services || typeof services !== "object" || Array.isArray(services)) {
    throw new Error(`services object is required for doctor ${doctorId}`);
  }

  const results = [];

  for (const [serviceTypeRaw, serviceConfig] of Object.entries(services)) {
    const serviceType = assertServiceType(serviceTypeRaw);
    const payoutAmount = assertMoney(serviceConfig?.payoutAmount, "payoutAmount");
    const maxDailyPlanConsults = assertPositiveInt(
      serviceConfig?.maxDailyPlanConsults ?? 10,
      "maxDailyPlanConsults",
    );

    const existing = await client.query(
      `
      SELECT id
      FROM doctor_plan_participation
      WHERE doctor_id = $1
        AND plan_tier = $2
        AND service_type = $3
      LIMIT 1
      `,
      [doctorId, planTier, serviceType],
    );

    if (existing.rowCount > 0) {
      const id = existing.rows[0].id;

      await client.query(
        `
        UPDATE doctor_plan_participation
        SET
          payout_amount = $1,
          max_daily_plan_consults = $2,
          is_active = true,
          updated_at = now()
        WHERE id = $3
        `,
        [payoutAmount, maxDailyPlanConsults, id],
      );

      results.push({ action: "updated", id, doctorId, planTier, serviceType });
      continue;
    }

    const id = randomUUID();

    await client.query(
      `
      INSERT INTO doctor_plan_participation (
        id,
        doctor_id,
        plan_tier,
        service_type,
        payout_amount,
        max_daily_plan_consults,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, now(), now())
      `,
      [id, doctorId, planTier, serviceType, payoutAmount, maxDailyPlanConsults],
    );

    results.push({ action: "created", id, doctorId, planTier, serviceType });
  }

  return results;
}

async function main() {
  const config = await readConfig();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const allResults = [];

    for (const row of config) {
      const results = await upsertPoolRow(client, row);
      allResults.push(...results);
    }

    await client.query("COMMIT");

    console.log("Doctor plan pool upserted safely:");
    for (const result of allResults) {
      console.log(
        `- ${result.action}: doctor=${result.doctorId}, tier=${result.planTier}, service=${result.serviceType}`,
      );
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

