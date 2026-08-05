import { createHash, randomBytes } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiKey(): string {
  return `nomi_${randomBytes(24).toString("base64url")}`;
}

export function generateSessionToken(): string {
  return `nomi_sess_${randomBytes(24).toString("base64url")}`;
}
