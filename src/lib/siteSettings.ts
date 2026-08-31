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

export type AnnouncementLinkStyle = "link" | "button";

export type Announcement = {
  text: string | null;
  enabled: boolean;
  linkUrl: string | null;
  linkText: string | null;
  linkStyle: AnnouncementLinkStyle;
  hideOnHome: boolean;
};

export async function getAnnouncement(): Promise<Announcement> {
  const setting = await prisma.siteSetting.findUnique({
    where: { id: SITE_SETTING_ID },
    select: {
      announcementText: true,
      announcementEnabled: true,
      announcementLinkUrl: true,
      announcementLinkText: true,
      announcementLinkStyle: true,
      announcementHideOnHome: true,
    },
  });
  return {
    text: setting?.announcementText ?? null,
    enabled: setting?.announcementEnabled ?? false,
    linkUrl: setting?.announcementLinkUrl ?? null,
    linkText: setting?.announcementLinkText ?? null,
    linkStyle: setting?.announcementLinkStyle === "button" ? "button" : "link",
    hideOnHome: setting?.announcementHideOnHome ?? false,
  };
}

export type MerchAbTest = {
  enabled: boolean;
  variantAText: string;
  variantBText: string;
  /** When true, the header merch link is hidden until the visitor is "engaged" (see src/lib/merchEngagement.ts). */
  linkGateEnabled: boolean;
};

export async function getMerchAbTest(): Promise<MerchAbTest> {
  const setting = await prisma.siteSetting.findUnique({
    where: { id: SITE_SETTING_ID },
    select: {
      merchAbTestEnabled: true,
      merchVariantAText: true,
      merchVariantBText: true,
      merchLinkGateEnabled: true,
    },
  });
  return {
    enabled: setting?.merchAbTestEnabled ?? true,
    variantAText: setting?.merchVariantAText ?? "Your wife will hate it",
    variantBText: setting?.merchVariantBText ?? "Mom would be so disappointed",
    linkGateEnabled: setting?.merchLinkGateEnabled ?? true,
  };
}

export async function setMerchAbTest(test: MerchAbTest): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: {
      id: SITE_SETTING_ID,
      merchAbTestEnabled: test.enabled,
      merchVariantAText: test.variantAText,
      merchVariantBText: test.variantBText,
      merchLinkGateEnabled: test.linkGateEnabled,
    },
    update: {
      merchAbTestEnabled: test.enabled,
      merchVariantAText: test.variantAText,
      merchVariantBText: test.variantBText,
      merchLinkGateEnabled: test.linkGateEnabled,
    },
  });
}

export async function setAnnouncement(announcement: Announcement): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: {
      id: SITE_SETTING_ID,
      announcementText: announcement.text,
      announcementEnabled: announcement.enabled,
      announcementLinkUrl: announcement.linkUrl,
      announcementLinkText: announcement.linkText,
      announcementLinkStyle: announcement.linkStyle,
      announcementHideOnHome: announcement.hideOnHome,
    },
    update: {
      announcementText: announcement.text,
      announcementEnabled: announcement.enabled,
      announcementLinkUrl: announcement.linkUrl,
      announcementLinkText: announcement.linkText,
      announcementLinkStyle: announcement.linkStyle,
      announcementHideOnHome: announcement.hideOnHome,
    },
  });
}
