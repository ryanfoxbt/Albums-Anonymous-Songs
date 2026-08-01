import { prisma } from "@/lib/prisma";

export const MAX_TRACKS = 10;

export function parseSongIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0 || value.length > MAX_TRACKS) return null;
  if (!value.every((id): id is string => typeof id === "string")) return null;
  return value;
}

export async function songIdsExist(songIds: string[]): Promise<boolean> {
  const matchingSongs = await prisma.song.findMany({
    where: { id: { in: songIds } },
    select: { id: true },
  });
  return matchingSongs.length === songIds.length;
}
