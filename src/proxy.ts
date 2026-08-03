import { randomUUID } from "node:crypto";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Anonymous visitor/session identity for first-party analytics (see
// src/lib/analyticsTracking.ts and src/app/api/track/*). Cookies only —
// no DB work here, that all happens in route handlers.
const VISITOR_COOKIE = "aa_vid";
const SESSION_COOKIE = "aa_sid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days, the browser-enforced cap
const SESSION_MAX_AGE = 60 * 30; // 30 min sliding window

const UNTRACKED_PREFIXES = ["/admin", "/api", "/sign-in", "/sign-up"];

function shouldAssignTrackingCookies(pathname: string): boolean {
  return !UNTRACKED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default clerkMiddleware((_auth, req: NextRequest) => {
  const response = NextResponse.next();

  if (!shouldAssignTrackingCookies(req.nextUrl.pathname)) {
    return response;
  }

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };

  if (!req.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, randomUUID(), {
      ...cookieOptions,
      maxAge: VISITOR_MAX_AGE,
    });
  }

  // Re-set on every request so active browsing keeps sliding the
  // session forward; a missing cookie (new tab or 30+ idle minutes)
  // mints a fresh id, which the pageview route treats as a new session.
  response.cookies.set(
    SESSION_COOKIE,
    req.cookies.get(SESSION_COOKIE)?.value ?? randomUUID(),
    { ...cookieOptions, maxAge: SESSION_MAX_AGE },
  );

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
