import Link from "next/link";
import type { Metadata } from "next";
import { DjStudio } from "@/components/dj/DjStudio";
import { formatArtistCredit } from "@/lib/artistCredit";
import { getSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

const title = "DJ the Funny Songs";
const description =
  "Two decks, EQ, filters, echo, reverb, scratch — mix Albums Anonymous parody songs right in your browser, then share your set. No login to play.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { title, description },
};

export default async function DjPage() {
  const songs = await getSongs({ sortBy: "title" });

  const djSongs = songs.map((song) => ({
    id: song.id,
    title: song.title,
    artistName: formatArtistCredit(song),
    audioUrl: song.audioUrl,
    coverImageUrl: song.coverImageUrl,
    hidden: song.hidden,
    durationSeconds: song.durationSeconds,
    playCount: song.playCount ?? 0,
    createdAt: song.createdAt,
    bpm: song.bpm,
    podcastEpisodeTitle: song.podcastEpisodeTitle,
    podcastEpisodeUrl: song.podcastEpisodeUrl,
    firstHeardOnEpisode: song.firstHeardOnEpisode,
  }));

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">DJ Booth</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Load a song onto each deck, mix them, mangle them with the FX — then
            hit Record and share your set. Playing is free, no login.{" "}
            <Link href="/dj/learn" className="underline hover:text-foreground">
              New to this? Learn to DJ →
            </Link>
          </p>
        </header>

        <DjStudio songs={djSongs} />
      </main>
    </div>
  );
}
