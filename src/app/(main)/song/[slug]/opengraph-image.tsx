import { ImageResponse } from "next/og";
import { formatArtistCredit } from "@/lib/artistCredit";
import { OgImageContent } from "@/lib/ogImage";
import { getSongBySlug } from "@/lib/songs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export const alt = "Albums Anonymous song";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);

  return new ImageResponse(
    (
      <OgImageContent
        title={song?.title ?? "Albums Anonymous"}
        subtitle={
          song
            ? `${formatArtistCredit(song)} · ${song.genre.name} · Albums Anonymous`
            : "Funny original songs & a comedy podcast about albums"
        }
      />
    ),
    size,
  );
}
