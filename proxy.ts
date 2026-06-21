import { NextResponse, type NextRequest } from "next/server";
import { isAppHost, customDomainRewrite } from "@/lib/domains/host";

// Next 16 renamed `middleware` → `proxy`. This does an OPTIMISTIC auth gate
// (cookie presence only — fast, runs on every navigation). The real/secure
// checks live in route handlers (requireApiUser) and server pages (requireUser).
//
//  • Published sites (/p, /c) and the auth endpoints stay public.
//  • API routes enforce their own auth, so we don't redirect them here.
//  • Every other (builder) page route requires the session cookie.

// Public, pre-auth pages (redirect to "/" when already signed in). NOTE: do not
// add "/onboarding" here — although it lives under app/(auth)/ for organization,
// it is a session-required post-login page (requireUser); gating it as a public
// auth page would redirect authenticated users away mid-onboarding.
const AUTH_PAGES = ["/login", "/signup", "/forgot", "/reset"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (!isAppHost(host)) {
    const rewriteTo = customDomainRewrite(pathname);
    if (!rewriteTo) return NextResponse.next();
    return NextResponse.rewrite(new URL(rewriteTo, req.url));
  }

  // Never gate: API (handlers enforce), published pages, the internal
  // screenshot render route (token-gated), Next internals.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/internal/") ||
    pathname.startsWith("/store")
  ) {
    return NextResponse.next();
  }

  const hasSession = !!req.cookies.get("pc_session")?.value;
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isAuthPage) {
    // Already signed in → bounce away from auth pages.
    if (hasSession) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // All other (builder) routes require a session.
  if (!hasSession) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static asset files.
    "/((?!_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js)$).*)",
  ],
};
