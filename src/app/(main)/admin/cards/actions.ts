"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireAdmin } from "@/lib/adminAuth";
import { getDefaultCard, type ArtistCardPatch } from "@/lib/artistCards";
import { prisma } from "@/lib/prisma";
import {
  resetArtistCard,
  setArtistCardOverride,
} from "@/lib/artistCardStore";

function s(value: unknown, max: number): string {
  return (typeof value === "string" ? value : "").trim().slice(0, max);
}

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim()
    : fallback;
}

function rarity(value: unknown): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 2;
}

function revalidateCard(slug: string) {
  revalidatePath(`/artist/${slug}`);
  revalidatePath("/artist/[slug]", "page");
  revalidatePath("/admin/cards");
  revalidatePath(`/admin/cards/${slug}`);
  revalidatePath("/llms.txt");
}

async function deleteBlobIfPossible(url: string | null | undefined) {
  if (!url || !url.includes("blob.vercel-storage.com")) return;
  try {
    await del(url);
  } catch {
    // best effort
  }
}

export async function saveArtistCard(
  slug: string,
  patch: ArtistCardPatch,
  imageUrl: string | null,
): Promise<{ ok: true }> {
  await requireAdmin();

  const base = getDefaultCard(slug);
  if (!base) throw new Error("Unknown card.");

  const tracks = (Array.isArray(patch.tracks) ? patch.tracks : [])
    .slice(0, 2)
    .map((t) => ({
      cost: s(t?.cost, 16),
      name: s(t?.name, 60),
      text: s(t?.text, 400),
      hype: s(t?.hype, 8),
    }));

  const clean: ArtistCardPatch = {
    name: s(patch.name, 60) || base.name,
    title: s(patch.title, 90) || base.title,
    style: {
      icon: s(patch.style?.icon, 8) || base.style.icon,
      label: s(patch.style?.label, 24) || base.style.label,
    },
    stat: {
      label: s(patch.stat?.label, 24) || base.stat.label,
      value: s(patch.stat?.value, 12) || base.stat.value,
    },
    tracks: tracks.length ? tracks : base.tracks,
    bombsAt: s(patch.bombsAt, 90) || base.bombsAt,
    shrugsOff: s(patch.shrugsOff, 90) || base.shrugsOff,
    exitCost: s(patch.exitCost, 90) || base.exitCost,
    flavor: s(patch.flavor, 300) || base.flavor,
    imageAlt: s(patch.imageAlt, 300) || base.imageAlt,
    rarity: rarity(patch.rarity),
    accent: hex(patch.accent, base.accent),
    accentInk: hex(patch.accentInk, base.accentInk),
  };

  const previous = await prisma.artistCardOverride.findUnique({
    where: { slug },
    select: { imageUrl: true },
  });

  await setArtistCardOverride(slug, clean, imageUrl);

  if (previous?.imageUrl && previous.imageUrl !== imageUrl) {
    await deleteBlobIfPossible(previous.imageUrl);
  }

  revalidateCard(slug);
  return { ok: true };
}

export async function resetArtistCardAction(
  slug: string,
): Promise<{ ok: true }> {
  await requireAdmin();

  const previous = await prisma.artistCardOverride.findUnique({
    where: { slug },
    select: { imageUrl: true },
  });

  await resetArtistCard(slug);
  await deleteBlobIfPossible(previous?.imageUrl);

  revalidateCard(slug);
  return { ok: true };
}
