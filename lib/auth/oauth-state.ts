import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET || "dev-auth-secret-change-me";
const TTL_MS = 10 * 60_000; // 10 minutes

type StatePayload = { next: string };

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("base64url");
}

/** Token = "<base64url(json)>.<hmac>"; json = { next, nonce, exp }. */
export function signState(data: { next?: string }, now: number = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({
      next: data.next || "",
      nonce: randomBytes(8).toString("hex"),
      exp: now + TTL_MS,
    }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyState(token: string, now: number = Date.now()): StatePayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof json.exp !== "number" || json.exp < now) return null;
    return { next: typeof json.next === "string" ? json.next : "" };
  } catch {
    return null;
  }
}
