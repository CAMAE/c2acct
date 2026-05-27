import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "pat-scrypt-v1";
const KEY_LENGTH = 64;

export type PasswordValidationResult = {
  ok: boolean;
  reason: string | null;
};

export function validatePilotPassword(password: string): PasswordValidationResult {
  if (password.length < 12) {
    return { ok: false, reason: "Password must be at least 12 characters." };
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      reason: "Password must include lowercase, uppercase, and numeric characters.",
    };
  }

  return { ok: true, reason: null };
}

export function isSupportedPasswordHash(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const [prefix, salt, hash] = value.split("$");
  return prefix === HASH_PREFIX && Boolean(salt) && Boolean(hash);
}

export async function hashPilotPassword(password: string) {
  const validation = validatePilotPassword(password);
  if (!validation.ok) {
    throw new Error(validation.reason ?? "Invalid pilot password.");
  }

  const salt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${HASH_PREFIX}$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPilotPassword(input: {
  password: string;
  passwordHash: string | null | undefined;
}) {
  if (!input.password || !isSupportedPasswordHash(input.passwordHash)) {
    return false;
  }

  const [, salt, expectedHash] = input.passwordHash!.split("$");
  const expected = Buffer.from(expectedHash, "base64url");
  const actual = (await scrypt(input.password, salt, expected.length)) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
