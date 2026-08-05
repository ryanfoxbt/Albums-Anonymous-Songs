"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

function required(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optional(value: FormDataEntryValue | null): string | null {
  return required(value);
}

export async function createUtmLink(formData: FormData) {
  await requireAdmin();

  const label = required(formData.get("label"));
  const destinationPath = required(formData.get("destinationPath"));
  const utmSource = required(formData.get("utmSource"));
  const utmMedium = required(formData.get("utmMedium"));
  const utmCampaign = required(formData.get("utmCampaign"));

  if (!label || !destinationPath || !utmSource || !utmMedium || !utmCampaign) {
    redirect(
      `/admin/analytics/utm?error=${encodeURIComponent(
        "Fill in label, destination, source, medium, and campaign.",
      )}`,
    );
  }

  await prisma.utmLink.create({
    data: {
      label,
      destinationPath,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm: optional(formData.get("utmTerm")),
      utmContent: optional(formData.get("utmContent")),
    },
  });

  revalidatePath("/admin/analytics/utm");
  redirect("/admin/analytics/utm");
}
