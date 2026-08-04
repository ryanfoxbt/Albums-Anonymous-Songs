import type { Metadata } from "next";
import { SongBrowser } from "@/components/SongBrowser";
import { getArtists, getCategories, getGenres, getSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

const title = "Listen to Funny Parody Songs";
const description =
  "Stream free funny original songs and parody tracks from Albums Anonymous — plus the comedy podcast where they're born. New songs weekly, no login required.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { title, description },
};

export default async function ListenPage() {
  const [songs, artists, genres, categories] = await Promise.all([
    getSongs(),
    getArtists(),
    getGenres(),
    getCategories(),
  ]);

  const musicPlaylistJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: "Albums Anonymous — Funny Songs",
    description:
      "Funny original songs and parody tracks from Albums Anonymous.",
    numTracks: songs.length,
    track: songs.map((song) => ({
      "@type": "MusicRecording",
      name: song.title,
      byArtist: { "@type": "MusicGroup", name: song.artist.name },
      genre: song.genre.name,
      url: `https://albumsanonymous.com/song/${song.slug}`,
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
      </main>
    </div>
  );
}
