import type { Metadata } from "next";
import { PodcastLinks } from "@/components/PodcastLinks";
import { SocialLinks } from "@/components/SocialLinks";
import { SongBrowser } from "@/components/SongBrowser";
import { SubscribeForm } from "@/components/SubscribeForm";
import { getArtists, getCategories, getGenres, getSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Listen to Funny Parody Songs",
  description:
    "Stream free funny original songs and parody tracks from Albums Anonymous — new songs weekly, no login required.",
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
            Premium stupidity, deuced weekly. Stream free, sans login -{" "}
            <a
              href="#subscribe"
              className="underline hover:text-black dark:hover:text-white"
            >
              sub below
            </a>
            . Fight FOMO.
          </p>
        </header>

        <SongBrowser
          songs={songs}
          artists={artists}
          genres={genres}
          categories={categories}
        />

        <footer className="mt-6 flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          <div id="subscribe" className="scroll-mt-20">
            <SubscribeForm />
          </div>

          <PodcastLinks />

          <SocialLinks />

          <p className="text-xs text-black/40 dark:text-white/40">
            Albums Anonymous is a podcast from{" "}
            <a
              href="https://www.permrecords.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-black/60 dark:hover:text-white/60"
            >
              Permanent Records LLC
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
