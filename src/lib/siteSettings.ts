import { prisma } from "@/lib/prisma";

const SITE_SETTING_ID = "default";

export async function getSiteLogoUrl(): Promise<string | null> {
  const setting = await prisma.siteSetting.findUnique({
    where: { id: SITE_SETTING_ID },
    select: { logoUrl: true },
  });
  return setting?.logoUrl ?? null;
}

export async function setSiteLogoUrl(logoUrl: string | null): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: { id: SITE_SETTING_ID, logoUrl },
    update: { logoUrl },
  });
}
