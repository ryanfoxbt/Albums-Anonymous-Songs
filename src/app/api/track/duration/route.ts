import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const pageViewId =
    typeof body?.pageViewId === "string" ? body.pageViewId : null;
  const durationMs =
    typeof body?.durationMs === "number" && Number.isFinite(body.durationMs)
      ? Math.min(Math.max(0, Math.round(body.durationMs)), MAX_DURATION_MS)
      : null;

  if (!pageViewId || durationMs === null) {
    return new NextResponse(null, { status: 204 });
  }

  await prisma.pageView
    .update({ where: { id: pageViewId }, data: { durationMs } })
    .catch(() => {
      // Beacon can race a page that no longer exists client-side — non-critical.
    });

  return new NextResponse(null, { status: 204 });
}
