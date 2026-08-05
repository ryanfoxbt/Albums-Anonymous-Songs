import { ImageResponse } from "next/og";
import { getSiteLogoUrl } from "@/lib/siteSettings";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
// The logo comes from the DB (admin-uploaded via /admin/settings), which
// Next's static analysis can't see — force this to render per-request so
// a logo change shows up without a redeploy.
export const dynamic = "force-dynamic";

export default async function AppleIcon() {
  const logoUrl = await getSiteLogoUrl();

  return new ImageResponse(
    logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        width={size.width}
        height={size.height}
        style={{ objectFit: "cover" }}
        alt=""
      />
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F760D6",
          color: "#ffffff",
          fontSize: 96,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        A
      </div>
    ),
    size,
  );
}
