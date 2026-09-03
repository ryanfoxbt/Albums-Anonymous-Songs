"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isForeignKeyError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

function optionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

async function deleteBlobIfPossible(url: string | null) {
  if (!url || !url.includes("blob.vercel-storage.com")) return;
  try {
    await del(url);
  } catch {
    // Best-effort cleanup — not worth failing the request over.
  }
}

/**
 * Bust the ISR cache for every public surface a song change can touch —
 * the song page itself plus the listing, hub and feed pages that embed it.
 */
function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/listen");
  revalidatePath("/free-comedy-music");
  revalidatePath("/ai-songs");
  revalidatePath("/dj");
  revalidatePath("/song/[slug]", "page");
  revalidatePath("/artist/[slug]", "page");
  revalidatePath("/genre/[slug]", "page");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/podcast/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

export async function createSong(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || title);
  const artistId = String(formData.get("artistId") ?? "");
  const genreId = String(formData.get("genreId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!title || !slug || !artistId || !genreId || !categoryId) {
    redirect(
      `/admin/songs/new?error=${encodeURIComponent(
        "Fill in title, artist, genre, and category.",
      )}`,
    );
  }

  const audioUrl = optionalString(formData.get("audioUrl"));
  if (!audioUrl) {
    redirect(
      `/admin/songs/new?error=${encodeURIComponent(
        "An audio file is required.",
      )}`,
    );
  }
  const coverImageUrl = optionalString(formData.get("coverImageUrl"));
  const rawFeaturedArtistId = optionalString(formData.get("featuredArtistId"));
  const featuredArtistId =
    rawFeaturedArtistId === artistId ? null : rawFeaturedArtistId;

  let createError: string | null = null;
  try {
    await prisma.song.create({
      data: {
        title,
        slug,
        audioUrl,
        downloadUrl: audioUrl,
        coverImageUrl,
        durationSeconds: optionalInt(formData.get("durationSeconds")),
        bpm: optionalInt(formData.get("bpm")),
        podcastEpisodeTitle: optionalString(
          formData.get("podcastEpisodeTitle"),
        ),
        podcastEpisodeUrl: optionalString(formData.get("podcastEpisodeUrl")),
        firstHeardOnEpisode: optionalInt(formData.get("firstHeardOnEpisode")),
        lyrics: optionalString(formData.get("lyrics")),
        artistId,
        featuredArtistId,
        genreId,
        categoryId,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      createError = "That slug is already taken.";
    } else if (isForeignKeyError(error)) {
      createError =
        "Artist, genre, or category wasn't fully saved yet — please try submitting again.";
    } else {
      throw error;
    }
  }

  if (createError) {
    await deleteBlobIfPossible(audioUrl);
    await deleteBlobIfPossible(coverImageUrl);
    redirect(`/admin/songs/new?error=${encodeURIComponent(createError)}`);
  }

  revalidatePath("/admin/songs");
  revalidateCatalog();
  redirect("/admin/songs");
}

export async function updateSong(songId: string, formData: FormData) {
  await requireAdmin();

  const existing = await prisma.song.findUnique({ where: { id: songId } });
  if (!existing) {
    redirect(
      `/admin/songs?error=${encodeURIComponent("Song not found.")}`,
    );
  }

  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || title);
  const artistId = String(formData.get("artistId") ?? "");
  const genreId = String(formData.get("genreId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!title || !slug || !artistId || !genreId || !categoryId) {
    redirect(
      `/admin/songs/${songId}?error=${encodeURIComponent(
        "Fill in title, artist, genre, and category.",
      )}`,
    );
  }

  const newAudioUrl = optionalString(formData.get("audioUrl"));
  const audioUrl = newAudioUrl ?? existing.audioUrl;

  const newCoverImageUrl = optionalString(formData.get("coverImageUrl"));
  const coverImageUrl = newCoverImageUrl ?? existing.coverImageUrl;

  const rawFeaturedArtistId = optionalString(formData.get("featuredArtistId"));
  const featuredArtistId =
    rawFeaturedArtistId === artistId ? null : rawFeaturedArtistId;

  let updateError: string | null = null;
  try {
    await prisma.song.update({
      where: { id: songId },
      data: {
        title,
        slug,
        audioUrl,
        downloadUrl: audioUrl,
        coverImageUrl,
        durationSeconds: optionalInt(formData.get("durationSeconds")),
        bpm: optionalInt(formData.get("bpm")),
        podcastEpisodeTitle: optionalString(
          formData.get("podcastEpisodeTitle"),
        ),
        podcastEpisodeUrl: optionalString(formData.get("podcastEpisodeUrl")),
        firstHeardOnEpisode: optionalInt(formData.get("firstHeardOnEpisode")),
        lyrics: optionalString(formData.get("lyrics")),
        artistId,
        featuredArtistId,
        genreId,
        categoryId,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      updateError = "That slug is already taken.";
    } else if (isForeignKeyError(error)) {
      updateError =
        "Artist, genre, or category wasn't fully saved yet — please try submitting again.";
    } else {
      throw error;
    }
  }

  if (updateError) {
    if (newAudioUrl) await deleteBlobIfPossible(newAudioUrl);
    if (newCoverImageUrl) await deleteBlobIfPossible(newCoverImageUrl);
    redirect(
      `/admin/songs/${songId}?error=${encodeURIComponent(updateError)}`,
    );
  }

  if (newAudioUrl && existing.audioUrl !== newAudioUrl) {
    await deleteBlobIfPossible(existing.audioUrl);
  }
  if (newCoverImageUrl && existing.coverImageUrl !== newCoverImageUrl) {
    await deleteBlobIfPossible(existing.coverImageUrl);
  }

  revalidatePath("/admin/songs");
  revalidateCatalog();
  redirect("/admin/songs");
}

export async function toggleSongHidden(formData: FormData) {
  await requireAdmin();

  const songId = String(formData.get("songId") ?? "");
  const existing = await prisma.song.findUnique({ where: { id: songId } });
  if (!existing) {
    redirect(`/admin/songs?error=${encodeURIComponent("Song not found.")}`);
  }

  await prisma.song.update({
    where: { id: songId },
    data: { hidden: !existing.hidden },
  });

  revalidatePath("/admin/songs");
  revalidateCatalog();
}

export async function createDownloadLink(formData: FormData) {
  await requireAdmin();

  const songId = String(formData.get("songId") ?? "");
  const existing = await prisma.song.findUnique({ where: { id: songId } });
  if (!existing) {
    redirect(`/admin/songs?error=${encodeURIComponent("Song not found.")}`);
  }

  const label = optionalString(formData.get("label"));

  await prisma.songDownloadLink.create({
    data: { songId, label },
  });

  revalidatePath(`/admin/songs/${songId}`);
}

export async function revokeDownloadLink(formData: FormData) {
  await requireAdmin();

  const linkId = String(formData.get("linkId") ?? "");
  const songId = String(formData.get("songId") ?? "");

  await prisma.songDownloadLink.update({
    where: { id: linkId },
    data: { revokedAt: new Date() },
  });

  revalidatePath(`/admin/songs/${songId}`);
}

export async function deleteSong(formData: FormData) {
  await requireAdmin();

  const songId = String(formData.get("songId") ?? "");
  const existing = await prisma.song.findUnique({ where: { id: songId } });
  if (!existing) {
    redirect(`/admin/songs?error=${encodeURIComponent("Song not found.")}`);
  }

  await prisma.song.delete({ where: { id: songId } });
  await deleteBlobIfPossible(existing.audioUrl);
  await deleteBlobIfPossible(existing.coverImageUrl);

  revalidatePath("/admin/songs");
  revalidateCatalog();
  redirect("/admin/songs");
}
