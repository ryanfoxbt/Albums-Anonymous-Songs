"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export type SaveSongBpmResult =
  | { ok: true; bpm: number }
  | { ok: false; error: string };

/**
 * Persists a tapped/derived BPM onto the Song record. Called from the admin
 * DJ board — takes only the song id plus the new value, re-reads the row
 * from the database, and is gated behind {@link requireAdmin}.
 */
export async function saveSongBpm(
  songId: string,
  bpm: number,
): Promise<SaveSongBpmResult> {
  await requireAdmin();

  if (typeof songId !== "string" || songId.trim() === "") {
    return { ok: false, error: "Missing song." };
  }

  const rounded = Math.round(bpm);
  if (!Number.isFinite(rounded) || rounded < 40 || rounded > 300) {
    return { ok: false, error: "BPM must be between 40 and 300." };
  }

  const existing = await prisma.song.findUnique({ where: { id: songId } });
  if (!existing) {
    return { ok: false, error: "Song not found." };
  }

  await prisma.song.update({ where: { id: songId }, data: { bpm: rounded } });

  revalidatePath("/admin/dj");
  revalidatePath(`/admin/songs/${songId}`);
  return { ok: true, bpm: rounded };
}
