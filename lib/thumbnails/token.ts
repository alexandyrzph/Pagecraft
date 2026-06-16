import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.THUMBNAIL_SECRET || "dev-thumbnail-secret-change-me";
const TTL_MS = 60_000; // tokens are valid for 60s — long enough for one capture

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Token shape: "<expiryMs>.<hmac(id.expiryMs)>" */
export function signShotToken(id: string, now: number = Date.now()): string {
  const exp = now + TTL_MS;
  return `${exp}.${sign(`${id}.${exp}`)}`;
}

export function verifyShotToken(id: string, token: string, now: number = Date.now()): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return false;
  const expected = sign(`${id}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
