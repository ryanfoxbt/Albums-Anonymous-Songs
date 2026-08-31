import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SongCardList } from "@/components/SongCardList";
import { getGenrePage, getGenresWithSongs } from "@/lib/catalog";
import { absoluteUrl, SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const genres = await getGenresWithSongs();
  return genres.map((genre) => ({ slug: genre.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGenrePage(slug);
  if (!data) return { title: "Genre Not Found" };

  const name = data.genre.name;
  const lower = name.toLowerCase();
  const count = data.songs.length;
  const title = `Funny ${name} Songs — ${count} Comedy ${name} Tracks`;
  const description = `${count} funny ${lower} song${count === 1 ? "" : "s"} from Albums Anonymous — original comedy ${lower} written under parody-artist personas. Stream free, no login.`;

  return {
    title,
    description,
    keywords: [
      `funny ${lower} songs`,
      `comedy ${lower}`,
      `${lower} parody songs`,
      `funny ${lower} music`,
      "comedy songs",
    ],
    alternates: { canonical: `/genre/${slug}` },
    openGraph: { title, description, url: absoluteUrl(`/genre/${slug}`) },
    twitter: { title, description },
  };
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getGenrePage(slug);
  if (!data) notFound();

  const { genre, songs, artists } = data;
  const lower = genre.name.toLowerCase();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Funny ${genre.name} Songs`,
    url: absoluteUrl(`/genre/${slug}`),
    description: `Original comedy ${lower} songs from Albums Anonymous.`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: songs.length,
      itemListElement: songs.map((song, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/song/${song.slug}`),
        name: song.title,
      })),
    },
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
        name: `${genre.name} songs`,
        item: absoluteUrl(`/genre/${slug}`),
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <nav className="text-xs text-black/50 dark:text-white/50">
          <Link href="/listen" className="underline hover:text-foreground">
            All songs
          </Link>{" "}
          / <span>{genre.name}</span>
        </nav>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Funny {genre.name.toLowerCase()} songs
          </h1>
          <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
            {songs.length} original comedy {lower} song
            {songs.length === 1 ? "" : "s"} from the Albums Anonymous podcast,
            written under parody-artist personas
            {artists.length > 0 && ` like ${artists.slice(0, 3).join(", ")}`}.
            Every track streams free with no login.
          </p>
        </header>

        <SongCardList songs={songs} />

        <p className="border-t border-black/10 pt-4 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
          Browse{" "}
          <Link href="/listen" className="underline hover:text-foreground">
            every song
          </Link>
          , or jump to{" "}
          <Link
            href="/free-comedy-music"
            className="underline hover:text-foreground"
          >
            free comedy music
          </Link>{" "}
          and{" "}
          <Link href="/podcast" className="underline hover:text-foreground">
            the podcast
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
