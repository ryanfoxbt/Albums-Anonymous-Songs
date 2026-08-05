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

function isValidAnnouncementLink(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function updateAnnouncement(formData: FormData) {
  await requireAdmin();

  const text = String(formData.get("text") ?? "").trim();
  const enabled = formData.get("enabled") === "on";
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const linkText = String(formData.get("linkText") ?? "").trim();
  const linkStyle = formData.get("linkStyle") === "button" ? "button" : "link";

  if (enabled && !text) {
    redirect(
      `/admin/settings?error=${encodeURIComponent("Add banner text before enabling it.")}`,
    );
  }

  if (linkUrl && !isValidAnnouncementLink(linkUrl)) {
    redirect(
      `/admin/settings?error=${encodeURIComponent("Link URL must be a full https:// link or a path starting with /.")}`,
    );
  }

  await setAnnouncement({
    text: text || null,
    enabled,
    linkUrl: linkUrl || null,
    linkText: linkUrl ? linkText || null : null,
    linkStyle,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect("/admin/settings");
}
