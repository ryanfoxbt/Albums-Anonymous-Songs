"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function createSocialLink(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();

  if (!name || !href) {
    redirect(
      `/admin/social-links?error=${encodeURIComponent(
        "Name and link are required.",
      )}`,
    );
  }

  await prisma.socialLink.create({ data: { name, href } });

  revalidatePath("/admin/social-links");
  revalidatePath("/listen");
  redirect("/admin/social-links");
}

export async function updateSocialLink(id: string, formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();

  if (!name || !href) {
    redirect(
      `/admin/social-links?error=${encodeURIComponent(
        "Name and link are required.",
      )}`,
    );
  }

  await prisma.socialLink.update({ where: { id }, data: { name, href } });

  revalidatePath("/admin/social-links");
  revalidatePath("/listen");
  redirect("/admin/social-links");
}

export async function deleteSocialLink(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  await prisma.socialLink.delete({ where: { id } });

  revalidatePath("/admin/social-links");
  revalidatePath("/listen");
  redirect("/admin/social-links");
}
