import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_LISTENED_SECONDS = 24 * 60 * 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  const listenedSeconds =
    typeof body?.listenedSeconds === "number" &&
    Number.isFinite(body.listenedSeconds)
      ? Math.min(Math.max(0, Math.round(body.listenedSeconds)), MAX_LISTENED_SECONDS)
      : null;
  const completed = body?.completed === true;

  if (!eventId || listenedSeconds === null) {
    return new NextResponse(null, { status: 204 });
  }

  await prisma.songPlayEvent
    .update({
      where: { id: eventId },
      data: { listenedSeconds, completed },
    })
    .catch(() => {
      // Beacon can race a song that already changed client-side — non-critical.
    });

  return new NextResponse(null, { status: 204 });
}
