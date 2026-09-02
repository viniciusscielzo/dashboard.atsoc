import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

export const LOCAL_AUTH_COOKIE = "atsoc_local_session";
export const LOCAL_AUTH_EMAIL = "vinicius@atsoc.com.br";

const PASSWORD_SALT = "477a836f479979dfc0fb40a978fcdbe8";
const PASSWORD_HASH = "e4709b280fe04406ceda6b82172bc43e84e49a1d502ec2532c1cf3bedc6c3ec3050282d9ce32fa985baa2bdd2771a252185ccb2e71396a073c3f383ba4509086";
const SESSION_SECRET = "d6660a0c37492b19dca2f23bb8faf4ef0a4236a88dd6eb8024fd06ad7f7be2dc743cf993be89355419cc6c2d6b6cab86";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const sign = (payload: string) =>
  createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");

export function verifyLocalCredentials(email: string, password: string) {
  if (email.trim().toLowerCase() !== LOCAL_AUTH_EMAIL) return false;
  const candidate = scryptSync(password.trim(), PASSWORD_SALT, 64);
  const expected = Buffer.from(PASSWORD_HASH, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function createLocalSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({ email: LOCAL_AUTH_EMAIL, expiresAt: Date.now() + SESSION_DURATION_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyLocalSessionToken(token?: string) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expectedSignature = sign(payload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      expiresAt?: number;
    };
    return session.email === LOCAL_AUTH_EMAIL && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export const localSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: Math.floor(SESSION_DURATION_MS / 1000),
};
