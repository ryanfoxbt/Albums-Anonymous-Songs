import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isValidSlug,
  randomEditToken,
  randomSlug,
} from "@/lib/recordSlug";
import { MAX_TRACKS, parseSongIds, songIdsExist } from "@/lib/recordValidation";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Pressing records requires a database connection." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const songIds = parseSongIds(body?.songIds);
  const requestedSlug =
    typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";

  if (!songIds) {
    return NextResponse.json(
      { error: `Choose between 1 and ${MAX_TRACKS} songs.` },
      { status: 400 },
    );
  }

  if (requestedSlug && !isValidSlug(requestedSlug)) {
    return NextResponse.json(
      {
        error:
          "URLs can only use lowercase letters, numbers, and hyphens (2-50 characters).",
      },
      { status: 400 },
    );
  }

  if (!(await songIdsExist(songIds))) {
    return NextResponse.json(
      { error: "One or more selected songs could not be found." },
      { status: 400 },
    );
  }

  const editToken = randomEditToken();

  if (requestedSlug) {
    try {
      const record = await prisma.pressedRecord.create({
        data: { slug: requestedSlug, songIds, editToken },
      });
      return NextResponse.json(
        { slug: record.slug, editToken },
        { status: 201 },
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      return NextResponse.json(
        { error: "That URL is taken. Try another." },
        { status: 409 },
      );
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = randomSlug();
    try {
      const record = await prisma.pressedRecord.create({
        data: { slug, songIds, editToken },
      });
      return NextResponse.json(
        { slug: record.slug, editToken },
        { status: 201 },
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      // Collision on the auto-generated slug — retry with a new one.
    }
  }

  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
