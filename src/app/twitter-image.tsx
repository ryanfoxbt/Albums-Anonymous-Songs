import { ImageResponse } from "next/og";
import { OgImageContent } from "@/lib/ogImage";
import { getSiteLogoUrl } from "@/lib/siteSettings";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// The logo comes from the DB (admin-uploaded via /admin/settings), which
// Next's static analysis can't see — force this to render per-request so
// a logo change shows up without a redeploy.
export const dynamic = "force-dynamic";

export default async function Image() {
  const logoUrl = await getSiteLogoUrl();
  return new ImageResponse(<OgImageContent logoUrl={logoUrl} />, size);
}
