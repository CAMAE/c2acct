import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;
const PASSWORD_FORMAT = "scrypt";

function toBase64Url(value: Buffer) {
  return value.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return [PASSWORD_FORMAT, toBase64Url(salt), toBase64Url(derived)].join("$");
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) {
    return false;
  }

  const [format, encodedSalt, encodedHash] = passwordHash.split("$");
  if (format !== PASSWORD_FORMAT || !encodedSalt || !encodedHash) {
    return false;
  }

  const salt = fromBase64Url(encodedSalt);
  const expectedHash = fromBase64Url(encodedHash);
  const derived = (await scrypt(password, salt, expectedHash.length)) as Buffer;

  if (derived.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(derived, expectedHash);
}
