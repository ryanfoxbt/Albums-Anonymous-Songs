import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get("aa_vid")?.value;
  const sessionId = cookieStore.get("aa_sid")?.value;
  if (!visitorId || !sessionId) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await request.json().catch(() => null);
  const songId = typeof body?.songId === "string" ? body.songId : null;
  const url = typeof body?.url === "string" ? body.url.slice(0, 500) : null;
  const path = typeof body?.path === "string" ? body.path.slice(0, 500) : "";
  if (!songId || !url) {
    return NextResponse.json(
      { error: "songId and url are required" },
      { status: 400 },
    );
  }

  await prisma.podcastLinkClick
    .create({ data: { songId, visitorId, sessionId, path, url } })
    .catch(() => {
      // e.g. the session row hasn't landed yet in a race with the pageview call
    });

  return new NextResponse(null, { status: 204 });
}
