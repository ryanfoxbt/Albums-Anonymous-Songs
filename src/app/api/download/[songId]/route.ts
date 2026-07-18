import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/download/[songId]">,
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required to download tracks." },
      { status: 401 },
    );
  }

  const { songId } = await ctx.params;
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  return NextResponse.redirect(new URL(song.downloadUrl, request.url));
}
