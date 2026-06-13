import type { CookieOptions } from "express";

const DEFAULT_AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type SameSiteValue = "lax" | "strict" | "none";

export const ADMIN_COOKIE = "asaancare_admin_token";
export const DOCTOR_COOKIE = "asaancare_doctor_token";
export const PATIENT_COOKIE = "asaancare_patient_token";

function getSameSite(): SameSiteValue {
  const value = (process.env.COOKIE_SAME_SITE ?? "lax").toLowerCase();

  if (value === "lax" || value === "strict" || value === "none") {
    return value;
  }

  return "lax";
}

function getSecure(): boolean {
  return process.env.NODE_ENV === "production" || getSameSite() === "none";
}

function getMaxAge(): number {
  const parsed = Number(process.env.AUTH_COOKIE_MAX_AGE_MS);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_AUTH_COOKIE_MAX_AGE_MS;
  }

  return parsed;
}

function getDomain(): string | undefined {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  return domain || undefined;
}

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: getSecure(),
  sameSite: getSameSite(),
  maxAge: getMaxAge(),
  path: "/",
  domain: getDomain(),
};

export const clearAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: getSecure(),
  sameSite: getSameSite(),
  path: "/",
  domain: getDomain(),
};




















// import type { CookieOptions } from "express";

// const sevenDays = 7 * 24 * 60 * 60 * 1000;

// export const ADMIN_COOKIE = "token";
// export const DOCTOR_COOKIE = "doctor_token";
// export const PATIENT_COOKIE = "patient_token";

// export const authCookieOptions: CookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "lax",
//   maxAge: sevenDays,
//   path: "/",
// };

// export const clearAuthCookieOptions: CookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "lax",
//   path: "/",
// };