"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
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

async function uploadIfProvided(
  file: FormDataEntryValue | null,
  prefix: string,
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const blob = await put(`${prefix}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });
  return blob.url;
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

  const audioUrl = await uploadIfProvided(formData.get("audioFile"), "audio");
  if (!audioUrl) {
    redirect(
      `/admin/songs/new?error=${encodeURIComponent(
        "An audio file is required.",
      )}`,
    );
  }
  const coverImageUrl = await uploadIfProvided(
    formData.get("coverFile"),
    "covers",
  );

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
        podcastEpisodeTitle: optionalString(
          formData.get("podcastEpisodeTitle"),
        ),
        podcastEpisodeUrl: optionalString(formData.get("podcastEpisodeUrl")),
        firstHeardOnEpisode: optionalInt(formData.get("firstHeardOnEpisode")),
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
  revalidatePath("/");
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

  const newAudioUrl = await uploadIfProvided(formData.get("audioFile"), "audio");
  const newCoverUrl = await uploadIfProvided(formData.get("coverFile"), "covers");

  const audioUrl = newAudioUrl ?? existing.audioUrl;
  const coverImageUrl = newCoverUrl ?? existing.coverImageUrl;

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
        podcastEpisodeTitle: optionalString(
          formData.get("podcastEpisodeTitle"),
        ),
        podcastEpisodeUrl: optionalString(formData.get("podcastEpisodeUrl")),
        firstHeardOnEpisode: optionalInt(formData.get("firstHeardOnEpisode")),
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
    if (newCoverUrl) await deleteBlobIfPossible(newCoverUrl);
    redirect(
      `/admin/songs/${songId}?error=${encodeURIComponent(updateError)}`,
    );
  }

  if (newAudioUrl && existing.audioUrl !== newAudioUrl) {
    await deleteBlobIfPossible(existing.audioUrl);
  }
  if (newCoverUrl && existing.coverImageUrl !== newCoverUrl) {
    await deleteBlobIfPossible(existing.coverImageUrl);
  }

  revalidatePath("/admin/songs");
  revalidatePath("/");
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
  revalidatePath("/");
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
  revalidatePath("/");
  redirect("/admin/songs");
}
