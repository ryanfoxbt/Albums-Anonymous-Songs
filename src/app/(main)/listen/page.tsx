import Link from "next/link";
import type { Metadata } from "next";
import { SongBrowser } from "@/components/SongBrowser";
import { getGenresWithSongs } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/siteUrl";
import { getArtists, getCategories, getGenres, getSongs } from "@/lib/songs";

export const revalidate = 3600;

const title = "Listen to Funny Parody Songs";
const description =
  "Stream free funny original songs and parody tracks from Albums Anonymous — plus the comedy podcast where they're born. New songs weekly, no login required.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/listen" },
  openGraph: { title, description, url: absoluteUrl("/listen") },
  twitter: { title, description },
};

export default async function ListenPage() {
  const [songs, artists, genres, categories, genreFacets] = await Promise.all([
    getSongs({ sortBy: "newest" }),
    getArtists(),
    getGenres(),
    getCategories(),
    getGenresWithSongs(),
  ]);

  const musicPlaylistJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: "Albums Anonymous — Funny Songs",
    description:
      "Funny original songs and parody tracks from Albums Anonymous.",
    numTracks: songs.length,
    track: songs.map((song, index) => ({
      "@type": "MusicRecording",
      position: index + 1,
      name: song.title,
      byArtist: { "@type": "MusicGroup", name: song.artist.name },
      genre: song.genre.name,
      url: absoluteUrl(`/song/${song.slug}`),
    })),
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(musicPlaylistJsonLd) }}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Albums Anonymous
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Premium audio stupidity, deuced weekly. Stream free, no login -{" "}
            <a
              href="#subscribe"
              className="underline hover:text-black dark:hover:text-white"
            >
              sub below
            </a>
            .
          </p>
        </header>

        <SongBrowser
          songs={songs}
          artists={artists}
          genres={genres}
          categories={categories}
        />

        <nav className="flex flex-col gap-2 border-t border-black/10 pt-4 text-sm dark:border-white/10">
          <h2 className="text-xs font-medium text-black/50 dark:text-white/50">
            Browse by genre
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {genreFacets.map((genre) => (
              <li key={genre.slug}>
                <Link
                  href={`/genre/${genre.slug}`}
                  className="rounded-full bg-black/5 px-2.5 py-1 text-xs hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  Funny {genre.name.toLowerCase()} songs ({genre.songCount})
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
