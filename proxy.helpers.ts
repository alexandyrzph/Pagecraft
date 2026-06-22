// Public, pre-auth pages (redirect to "/" when already signed in). NOTE: do not
// add "/onboarding" here — although it lives under app/(auth)/ for organization,
// it is a session-required post-login page (requireUser); gating it as a public
// auth page would redirect authenticated users away mid-onboarding.
const AUTH_PAGES = ["/login", "/signup", "/forgot", "/reset"];

// Never gate: API (handlers enforce), published pages, the internal
// screenshot render route (token-gated), Next internals.
const PUBLIC_PREFIXES = ["/api", "/p/", "/c/", "/internal/", "/store"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
