import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { MIX_MAX_EVENTS, MIX_MAX_MS } from "@/components/dj/mixTypes";
import { prisma } from "@/lib/prisma";
import { randomEditToken, randomSlug } from "@/lib/recordSlug";
import { songIdsExist } from "@/lib/recordValidation";

const MAX_MIX_SONGS = 24; // Auto DJ can cycle through a lot of tracks in one take

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function parseSongIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length < 1 || value.length > MAX_MIX_SONGS) return null;
  if (!value.every((id): id is string => typeof id === "string")) return null;
  return value;
}

function looksLikeEvents(value: unknown): value is { t: number; k: string }[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= MIX_MAX_EVENTS &&
    value.every(
      (e) =>
        e != null &&
        typeof e === "object" &&
        typeof (e as { t?: unknown }).t === "number" &&
        typeof (e as { k?: unknown }).k === "string",
    )
  );
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Saving a mix requires a database connection." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const songIds = parseSongIds(body?.songIds);
  const events = body?.events;
  const durationMs = Number(body?.durationMs);

  if (!songIds) {
    return NextResponse.json(
      { error: "A mix needs at least one loaded song." },
      { status: 400 },
    );
  }

  if (!looksLikeEvents(events)) {
    return NextResponse.json(
      { error: "That mix didn't record any moves." },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(durationMs) ||
    durationMs <= 0 ||
    durationMs > MIX_MAX_MS + 2000
  ) {
    return NextResponse.json(
      { error: "Mixes can be up to 3 minutes long." },
      { status: 400 },
    );
  }

  if (!(await songIdsExist(songIds))) {
    return NextResponse.json(
      { error: "One or more songs in the mix could not be found." },
      { status: 400 },
    );
  }

  const editToken = randomEditToken();
  const visitorId = (await cookies()).get("aa_vid")?.value ?? null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = randomSlug();
    try {
      const mix = await prisma.djMix.create({
        data: {
          slug,
          songIds,
          events: events as Prisma.InputJsonValue,
          durationMs: Math.round(durationMs),
          editToken,
          visitorId,
        },
      });
      return NextResponse.json({ slug: mix.slug, editToken }, { status: 201 });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      // Slug collision — retry with a fresh one.
    }
  }

  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
