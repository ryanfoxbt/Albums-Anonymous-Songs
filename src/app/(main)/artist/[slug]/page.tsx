import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArtistTradingCard } from "@/components/artist/ArtistTradingCard";
import { SongCardList } from "@/components/SongCardList";
import { CARD_SERIES, getAllArtistCards, getArtistCard } from "@/lib/artistCards";
import { getArtistPage, getArtistsWithSongs } from "@/lib/catalog";
import { getArtistSeo } from "@/lib/artistSeo";
import { absoluteUrl, SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const artists = await getArtistsWithSongs();
  return artists.map((artist) => ({ slug: artist.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getArtistPage(slug);
  if (!data) return { title: "Artist Not Found" };

  const seo = getArtistSeo(slug);
  const name = data.artist.name;
  const count = data.songs.length;
  const title = `${name} — Funny Songs & Parody Tracks`;
  const description =
    seo?.tagline ??
    `${name} is a parody artist from the Albums Anonymous comedy music podcast, with ${count} original comedy song${count === 1 ? "" : "s"} you can stream free.`;

  const keywords = [
    name,
    `${name} songs`,
    `${name} parody`,
    "funny songs",
    "comedy music",
  ];
  if (seo?.parodyOf) {
    keywords.push(`${seo.parodyOf} parody`, `${seo.parodyOf} parody song`);
  }

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/artist/${slug}` },
    openGraph: { title, description, url: absoluteUrl(`/artist/${slug}`) },
    twitter: { title, description },
  };
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getArtistPage(slug);
  if (!data) notFound();

  const { artist, songs, genres } = data;
  const seo = getArtistSeo(slug);
  const card = getArtistCard(slug);
  const cardsPrinted = getAllArtistCards().length;

  const musicGroupJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    url: absoluteUrl(`/artist/${slug}`),
    genre: genres,
    description: seo?.tagline ?? artist.bio ?? undefined,
    ...(seo?.parodyOf ? { description: seo.tagline } : {}),
    track: songs.map((song) => ({
      "@type": "MusicRecording",
      name: song.title,
      url: absoluteUrl(`/song/${song.slug}`),
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Songs",
        item: absoluteUrl("/listen"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: artist.name,
        item: absoluteUrl(`/artist/${slug}`),
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(musicGroupJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main
        className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6 ${
          card ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <nav className="text-xs text-black/50 dark:text-white/50">
          <Link href="/listen" className="underline hover:text-foreground">
            All songs
          </Link>{" "}
          / <span>{artist.name}</span>
        </nav>

        <div
          className={
            card
              ? "grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start"
              : "contents"
          }
        >
          {card && (
            <div className="flex flex-col items-center gap-2 lg:sticky lg:top-24">
              <ArtistTradingCard card={card} />
              <p className="max-w-[360px] text-center text-xs text-black/45 dark:text-white/45">
                Collectible card {card.number}/
                {String(CARD_SERIES.total).padStart(3, "0")} —{" "}
                {CARD_SERIES.name}, {CARD_SERIES.edition}.{" "}
                {cardsPrinted >= CARD_SERIES.total
                  ? "Full set."
                  : `${cardsPrinted} of ${CARD_SERIES.total} printed so far.`}{" "}
                Move your cursor over it.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {artist.name}
              </h1>
              <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
                {seo?.tagline ??
                  artist.bio ??
                  `${artist.name} is a parody artist from the Albums Anonymous comedy music podcast.`}
              </p>
              {artist.bio && seo?.tagline && artist.bio !== seo.tagline && (
                <p className="text-sm text-black/60 dark:text-white/60">
                  {artist.bio}
                </p>
              )}
              <p className="text-xs text-black/50 dark:text-white/50">
                {songs.length} song{songs.length === 1 ? "" : "s"}
                {genres.length > 0 && (
                  <>
                    {" · "}
                    {genres.map((genreName, i) => (
                      <span key={genreName}>
                        {i > 0 && ", "}
                        {genreName}
                      </span>
                    ))}
                  </>
                )}
              </p>
            </header>

            <SongCardList songs={songs} />

            <p className="border-t border-black/10 pt-4 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
              {artist.name} is one of the parody acts on{" "}
              <Link href="/listen" className="underline hover:text-foreground">
                Albums Anonymous
              </Link>
              . Hear where the songs come from on{" "}
              <Link href="/podcast" className="underline hover:text-foreground">
                the podcast
              </Link>
              , or{" "}
              <Link href="/dj" className="underline hover:text-foreground">
                mix them in the DJ booth
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
