import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ensureVisitorAndSession,
  getGeoCountry,
  isBot,
  parseUtmParams,
} from "@/lib/analyticsTracking";

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent");
  if (isBot(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  const cookieStore = await cookies();
  const visitorId = cookieStore.get("aa_vid")?.value;
  const sessionId = cookieStore.get("aa_sid")?.value;
  if (!visitorId || !sessionId) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.slice(0, 500) : null;
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  const referrer =
    typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;
  const utm = parseUtmParams(body?.utm ?? {});

  await ensureVisitorAndSession({
    visitorId,
    sessionId,
    pathname: path,
    utm,
    referrer,
    userAgent,
    country: getGeoCountry(request.headers),
  });

  const pageView = await prisma.pageView.create({
    data: { sessionId, path },
    select: { id: true },
  });

  return NextResponse.json({ pageViewId: pageView.id });
}
