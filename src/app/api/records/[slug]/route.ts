import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_TRACKS, parseSongIds, songIdsExist } from "@/lib/recordValidation";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/records/[slug]">,
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Editing records requires a database connection." },
      { status: 503 },
    );
  }

  const { slug } = await ctx.params;
  const body = await request.json().catch(() => null);
  const songIds = parseSongIds(body?.songIds);
  const editToken = typeof body?.editToken === "string" ? body.editToken : "";

  if (!songIds) {
    return NextResponse.json(
      { error: `Choose between 1 and ${MAX_TRACKS} songs.` },
      { status: 400 },
    );
  }

  const record = await prisma.pressedRecord.findUnique({ where: { slug } });
  if (!record) {
    return NextResponse.json(
      { error: "This record doesn't exist." },
      { status: 404 },
    );
  }

  if (!editToken || editToken !== record.editToken) {
    return NextResponse.json(
      { error: "You don't have permission to edit this record." },
      { status: 403 },
    );
  }

  if (!(await songIdsExist(songIds))) {
    return NextResponse.json(
      { error: "One or more selected songs could not be found." },
      { status: 400 },
    );
  }

  await prisma.pressedRecord.update({
    where: { slug },
    data: { songIds },
  });

  return NextResponse.json({ ok: true });
}
