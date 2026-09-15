/**
 * Admin session cookie: signed, stateless, no database table.
 *
 * Built on Web Crypto (`crypto.subtle`) rather than `node:crypto` so the same
 * code verifies the cookie in middleware (Edge runtime) and sets it from the
 * login Server Action (Node runtime) — both environments expose Web Crypto,
 * only one of them exposes `node:crypto`.
 *
 * The signing secret is derived from CONTROL_CENTER_PASSWORD, which is already
 * required and already secret — this avoids needing a second env var set up
 * in Vercel just for session signing. Rotating the password also invalidates
 * every existing session, which is the right behavior.
 *
 * A plain string comparison is used for the signature check, not a timing-safe
 * one — same trade-off already made in lib/project-setup/tokens.ts for the
 * same reason: this is a single-admin tool, not a multi-tenant target.
 */

export const SESSION_COOKIE_NAME = "jmt_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(signature);
}

/** Builds a signed cookie value good until `SESSION_MAX_AGE_SECONDS` from now. */
export async function createSessionCookieValue(password: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${expiresAt}`;
  const signature = await hmac(password, payload);
  return `${payload}.${signature}`;
}

/** Verifies a cookie value against the current password and expiry. */
export async function isValidSessionCookieValue(value: string | undefined, password: string): Promise<boolean> {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(password, payload);
  return expected === signature;
}
