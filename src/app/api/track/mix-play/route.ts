import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fired once when a viewer presses play on a shared mix replay. Distinct from
// the page-open count bumped in /mix/[slug]/page.tsx.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : null;
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  await prisma.djMix
    .update({ where: { slug }, data: { playCount: { increment: 1 } } })
    .catch(() => {
      // unknown slug or transient error — analytics only, never surface it
    });

  return new NextResponse(null, { status: 204 });
}
