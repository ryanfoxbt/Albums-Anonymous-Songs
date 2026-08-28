import { NextResponse } from "next/server";
import { getDownloadUrl } from "@vercel/blob";
import { getSongBySlug } from "@/lib/songs";

// Public per-song MP3 download. The email "soft gate" lives in the client
// (see src/lib/emailGate.ts + EmailGateDialog) — this endpoint just resolves
// the slug to a forced-download URL. The asset itself is public either way.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/download/song/[slug]">,
) {
  const { slug } = await ctx.params;
  const song = await getSongBySlug(slug);

  if (!song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  // Resolve to an absolute URL, then let getDownloadUrl append ?download=1 so
  // the Blob CDN serves it with Content-Disposition: attachment — no byte
  // proxying through this function.
  const absolute = new URL(song.downloadUrl, request.url).toString();
  let target: string;
  try {
    target = getDownloadUrl(absolute);
  } catch {
    target = absolute;
  }

  return NextResponse.redirect(target);
}
