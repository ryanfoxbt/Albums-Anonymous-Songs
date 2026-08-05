import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PodcastEpisodeBadge } from "@/components/player/PodcastEpisodeBadge";
import { SongPagePlayer } from "@/components/SongPagePlayer";
import { formatArtistCredit } from "@/lib/artistCredit";
import { getSongBySlug } from "@/lib/songs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) {
    return { title: "Song Not Found" };
  }

  const artistCredit = formatArtistCredit(song);
  const episodeNote = song.podcastEpisodeTitle
    ? ` First heard on: ${song.podcastEpisodeTitle}.`
    : "";

  const title = `${song.title} — ${artistCredit}`;
  const description = `"${song.title}" by ${artistCredit}, a funny ${song.genre.name.toLowerCase()} parody song from Albums Anonymous — funny original songs plus the comedy podcast where they're born.${episodeNote}`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function SongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  const artistCredit = formatArtistCredit(song);

  const musicRecordingJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: song.title,
    byArtist: { "@type": "MusicGroup", name: artistCredit },
    genre: song.genre.name,
    url: `https://albumsanonymous.com/song/${song.slug}`,
    ...(song.lyrics
      ? {
          recordingOf: {
            "@type": "MusicComposition",
            name: song.title,
            lyrics: { "@type": "CreativeWork", text: song.lyrics },
          },
        }
      : {}),
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(musicRecordingJsonLd),
        }}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <Link
          href="/listen"
          className="text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          ← All songs
        </Link>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{song.title}</h1>
          <p className="text-base font-medium text-[#F760D6]">
            {artistCredit}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
              {song.genre.name}
            </span>
            <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
              {song.category.name}
            </span>
          </div>
        </header>

        <SongPagePlayer song={song} />

        <PodcastEpisodeBadge
          songId={song.id}
          podcastEpisodeTitle={song.podcastEpisodeTitle}
          podcastEpisodeUrl={song.podcastEpisodeUrl}
        />

        {song.lyrics && (
          <section className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
              Lyrics
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/80 dark:text-white/80">
              {song.lyrics}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
