import { ImageResponse } from "next/og";
import { OgImageContent } from "@/lib/ogImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgImageContent />, size);
}
