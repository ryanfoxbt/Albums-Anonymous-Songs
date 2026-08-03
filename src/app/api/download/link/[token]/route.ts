import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/download/link/[token]">,
) {
  const { token } = await ctx.params;
  const link = await prisma.songDownloadLink.findUnique({
    where: { id: token },
    include: { song: true },
  });

  if (!link || link.revokedAt) {
    return NextResponse.json(
      { error: "This download link is invalid or has been revoked." },
      { status: 404 },
    );
  }

  await prisma.songDownloadLink.update({
    where: { id: link.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.redirect(new URL(link.song.downloadUrl, request.url));
}
