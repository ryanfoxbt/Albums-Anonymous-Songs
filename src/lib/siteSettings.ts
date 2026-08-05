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

export type Announcement = {
  text: string | null;
  enabled: boolean;
};

export async function getAnnouncement(): Promise<Announcement> {
  const setting = await prisma.siteSetting.findUnique({
    where: { id: SITE_SETTING_ID },
    select: { announcementText: true, announcementEnabled: true },
  });
  return {
    text: setting?.announcementText ?? null,
    enabled: setting?.announcementEnabled ?? false,
  };
}

export async function setAnnouncement(announcement: Announcement): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: {
      id: SITE_SETTING_ID,
      announcementText: announcement.text,
      announcementEnabled: announcement.enabled,
    },
    update: {
      announcementText: announcement.text,
      announcementEnabled: announcement.enabled,
    },
  });
}
