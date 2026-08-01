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

export async function createGenre(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);

  if (!name || !slug) {
    redirect(
      `/admin/genres?error=${encodeURIComponent("Name is required.")}`,
    );
  }

  try {
    await prisma.genre.create({ data: { name, slug } });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    redirect(
      `/admin/genres?error=${encodeURIComponent("That slug is already taken.")}`,
    );
  }

  revalidatePath("/admin/genres");
  revalidatePath("/");
  redirect("/admin/genres");
}

export async function updateGenre(genreId: string, formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);

  if (!name || !slug) {
    redirect(
      `/admin/genres?error=${encodeURIComponent("Name is required.")}`,
    );
  }

  try {
    await prisma.genre.update({ where: { id: genreId }, data: { name, slug } });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    redirect(
      `/admin/genres?error=${encodeURIComponent("That slug is already taken.")}`,
    );
  }

  revalidatePath("/admin/genres");
  revalidatePath("/");
  redirect("/admin/genres");
}

export async function deleteGenre(formData: FormData) {
  await requireAdmin();

  const genreId = String(formData.get("genreId") ?? "");
  const songCount = await prisma.song.count({ where: { genreId } });
  if (songCount > 0) {
    redirect(
      `/admin/genres?error=${encodeURIComponent(
        `Can't delete — ${songCount} song(s) still use this genre.`,
      )}`,
    );
  }

  await prisma.genre.delete({ where: { id: genreId } });

  revalidatePath("/admin/genres");
  redirect("/admin/genres");
}
