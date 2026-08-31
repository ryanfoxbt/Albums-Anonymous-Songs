import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDefaultCard,
  getDefaultCards,
  type ArtistCard,
  type ArtistCardPatch,
} from "@/lib/artistCards";

type Override = { data: ArtistCardPatch; imageUrl: string | null };

function mergeCard(base: ArtistCard, override?: Override): ArtistCard {
  if (!override) return base;
  const { data, imageUrl } = override;
  return {
    ...base,
    ...data,
    style: { ...base.style, ...(data.style ?? {}) },
    stat: { ...base.stat, ...(data.stat ?? {}) },
    tracks: data.tracks ?? base.tracks,
    image: imageUrl || base.image,
  };
}

/** One card: baked-in default with any admin override applied. */
export async function getArtistCard(
  slug: string,
): Promise<ArtistCard | undefined> {
  const base = getDefaultCard(slug);
  if (!base) return undefined;
  const row = await prisma.artistCardOverride.findUnique({ where: { slug } });
  return mergeCard(
    base,
    row
      ? { data: (row.data ?? {}) as ArtistCardPatch, imageUrl: row.imageUrl }
      : undefined,
  );
}

/** Every card, overrides applied. */
export async function getAllArtistCards(): Promise<ArtistCard[]> {
  const rows = await prisma.artistCardOverride.findMany();
  const bySlug = new Map<string, Override>(
    rows.map((row) => [
      row.slug,
      { data: (row.data ?? {}) as ArtistCardPatch, imageUrl: row.imageUrl },
    ]),
  );
  return getDefaultCards().map((base) => mergeCard(base, bySlug.get(base.slug)));
}

/** Whether an admin has customised this card. */
export async function hasArtistCardOverride(slug: string): Promise<boolean> {
  const row = await prisma.artistCardOverride.findUnique({
    where: { slug },
    select: { slug: true },
  });
  return row != null;
}

export async function setArtistCardOverride(
  slug: string,
  patch: ArtistCardPatch,
  imageUrl: string | null | undefined,
): Promise<void> {
  const data = patch as unknown as Prisma.InputJsonValue;
  await prisma.artistCardOverride.upsert({
    where: { slug },
    create: { slug, data, imageUrl: imageUrl ?? null },
    update: {
      data,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    },
  });
}

export async function resetArtistCard(slug: string): Promise<void> {
  await prisma.artistCardOverride.deleteMany({ where: { slug } });
}
