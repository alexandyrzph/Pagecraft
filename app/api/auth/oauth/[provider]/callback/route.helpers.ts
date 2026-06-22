export function sanitizeNext(next: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function oauthErrorReason(e: unknown): string {
  return e instanceof Error && e.message === "email_in_use" ? "email_in_use" : "oauth_failed";
}
