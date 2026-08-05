"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { requireAdmin } from "@/lib/adminAuth";
import { getSiteLogoUrl, setAnnouncement, setSiteLogoUrl } from "@/lib/siteSettings";

async function deleteBlobIfPossible(url: string | null) {
  if (!url || !url.includes("blob.vercel-storage.com")) return;
  try {
    await del(url);
  } catch {
    // Best-effort cleanup — not worth failing the request over.
  }
}

export async function updateSiteLogo(formData: FormData) {
  await requireAdmin();

  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  if (!logoUrl) {
    redirect(
      `/admin/settings?error=${encodeURIComponent("Upload a logo image first.")}`,
    );
  }

  const previousLogoUrl = await getSiteLogoUrl();
  await setSiteLogoUrl(logoUrl);
  if (previousLogoUrl && previousLogoUrl !== logoUrl) {
    await deleteBlobIfPossible(previousLogoUrl);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect("/admin/settings");
}

export async function removeSiteLogo() {
  await requireAdmin();

  const previousLogoUrl = await getSiteLogoUrl();
  await setSiteLogoUrl(null);
  await deleteBlobIfPossible(previousLogoUrl);

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect("/admin/settings");
}

export async function updateAnnouncement(formData: FormData) {
  await requireAdmin();

  const text = String(formData.get("text") ?? "").trim();
  const enabled = formData.get("enabled") === "on";

  if (enabled && !text) {
    redirect(
      `/admin/settings?error=${encodeURIComponent("Add banner text before enabling it.")}`,
    );
  }

  await setAnnouncement({ text: text || null, enabled });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect("/admin/settings");
}
