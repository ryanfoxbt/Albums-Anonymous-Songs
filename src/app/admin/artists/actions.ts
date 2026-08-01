"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function optionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function createArtist(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const bio = optionalString(formData.get("bio"));

  if (!name || !slug) {
    redirect(
      `/admin/artists?error=${encodeURIComponent("Name is required.")}`,
    );
  }

  try {
    await prisma.artist.create({ data: { name, slug, bio } });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    redirect(
      `/admin/artists?error=${encodeURIComponent("That slug is already taken.")}`,
    );
  }

  revalidatePath("/admin/artists");
  revalidatePath("/");
  redirect("/admin/artists");
}

export async function updateArtist(artistId: string, formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const bio = optionalString(formData.get("bio"));

  if (!name || !slug) {
    redirect(
      `/admin/artists?error=${encodeURIComponent("Name is required.")}`,
    );
  }

  try {
    await prisma.artist.update({
      where: { id: artistId },
      data: { name, slug, bio },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    redirect(
      `/admin/artists?error=${encodeURIComponent("That slug is already taken.")}`,
    );
  }

  revalidatePath("/admin/artists");
  revalidatePath("/");
  redirect("/admin/artists");
}

export async function deleteArtist(formData: FormData) {
  await requireAdmin();

  const artistId = String(formData.get("artistId") ?? "");
  const songCount = await prisma.song.count({ where: { artistId } });
  if (songCount > 0) {
    redirect(
      `/admin/artists?error=${encodeURIComponent(
        `Can't delete — ${songCount} song(s) still use this artist.`,
      )}`,
    );
  }

  await prisma.artist.delete({ where: { id: artistId } });

  revalidatePath("/admin/artists");
  redirect("/admin/artists");
}
