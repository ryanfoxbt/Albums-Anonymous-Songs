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

export async function createCategory(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);

  if (!name || !slug) {
    redirect(
      `/admin/categories?error=${encodeURIComponent("Name is required.")}`,
    );
  }

  try {
    await prisma.category.create({ data: { name, slug } });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    redirect(
      `/admin/categories?error=${encodeURIComponent("That slug is already taken.")}`,
    );
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function updateCategory(categoryId: string, formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);

  if (!name || !slug) {
    redirect(
      `/admin/categories?error=${encodeURIComponent("Name is required.")}`,
    );
  }

  try {
    await prisma.category.update({
      where: { id: categoryId },
      data: { name, slug },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    redirect(
      `/admin/categories?error=${encodeURIComponent("That slug is already taken.")}`,
    );
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function quickCreateCategory(
  name: string,
): Promise<{ id: string; name: string } | { error: string }> {
  await requireAdmin();

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  const slug = slugify(trimmed);

  try {
    const category = await prisma.category.create({
      data: { name: trimmed, slug },
    });
    revalidatePath("/admin/categories");
    return { id: category.id, name: category.name };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return { error: "A category with that name already exists." };
  }
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();

  const categoryId = String(formData.get("categoryId") ?? "");
  const songCount = await prisma.song.count({ where: { categoryId } });
  if (songCount > 0) {
    redirect(
      `/admin/categories?error=${encodeURIComponent(
        `Can't delete — ${songCount} song(s) still use this category.`,
      )}`,
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}
