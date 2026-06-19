import bcrypt from "bcryptjs";

const DEFAULT_SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must include at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isPasswordStrong(password: string): boolean {
  return validatePasswordStrength(password).valid;
}

export function isStrongPassword(password: string): boolean {
  return isPasswordStrong(password);
}

export function assertStrongPassword(password: string): void {
  const result = validatePasswordStrength(password);

  if (!result.valid) {
    throw new Error(result.errors.join(", "));
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertStrongPassword(password);

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? DEFAULT_SALT_ROUNDS);
  const safeSaltRounds =
    Number.isFinite(saltRounds) && saltRounds >= 10 && saltRounds <= 14
      ? saltRounds
      : DEFAULT_SALT_ROUNDS;

  return bcrypt.hash(password, safeSaltRounds);
}

export async function comparePassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!password || !passwordHash) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return comparePassword(password, passwordHash);
}

