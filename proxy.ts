import { NextResponse, type NextRequest } from "next/server";
import { isAppHost, customDomainRewrite } from "@/lib/domains/host";
import { isAuthPath, isPublicPath } from "./proxy.helpers";

// Next 16 renamed `middleware` → `proxy`. This does an OPTIMISTIC auth gate
// (cookie presence only — fast, runs on every navigation). The real/secure
// checks live in route handlers (requireApiUser) and server pages (requireUser).
//
//  • Published sites (/p, /c) and the auth endpoints stay public.
//  • API routes enforce their own auth, so we don't redirect them here.
//  • Every other (builder) page route requires the session cookie.

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (!isAppHost(host)) {
    const rewriteTo = customDomainRewrite(pathname);
    if (!rewriteTo) return NextResponse.next();
    return NextResponse.rewrite(new URL(rewriteTo, req.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = !!req.cookies.get("pc_session")?.value;
  const isAuthPage = isAuthPath(pathname);

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
