import Link from "next/link";
import type { Metadata } from "next";
import { MixPlayer } from "@/components/dj/MixPlayer";
import type { MixEvent } from "@/components/dj/mixTypes";
import { formatArtistCredit } from "@/lib/artistCredit";
import { prisma } from "@/lib/prisma";
import { getSongsByIds } from "@/lib/songs";

export const dynamic = "force-dynamic";

async function getMix(slug: string) {
  return prisma.djMix.findUnique({ where: { slug } });
}

export async function generateMetadata({
  params,
}: PageProps<"/mix/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const mix = await getMix(slug);
  if (!mix) return { title: "Mix Not Found" };

  const seconds = Math.round(mix.durationMs / 1000);
  const title = "Hear this DJ mix";
  const description = `A ${Math.floor(seconds / 60)}:${(seconds % 60)
    .toString()
    .padStart(2, "0")} DJ set built from Albums Anonymous parody songs — press play to hear it and watch every fader, knob and scratch move.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function MixPage({ params }: PageProps<"/mix/[slug]">) {
  const { slug } = await params;
  const mix = await getMix(slug);

  if (!mix) {
    return (
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:px-6">
          <h1 className="text-xl font-bold tracking-tight">No mix here</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            This mix hasn&apos;t been recorded — or its link is wrong.
          </p>
          <Link
            href="/dj"
            className="mt-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Make your own
          </Link>
        </main>
      </div>
    );
  }

  // Best-effort view count (page opened) — never blocks the page. The
  // "play" count is bumped separately when a viewer presses play.
  prisma.djMix
    .update({ where: { slug }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const rows = await getSongsByIds(mix.songIds);
  const songs = rows.map((song) => ({
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
          <h1 className="text-2xl font-bold tracking-tight">Someone&apos;s DJ set</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Press play to hear the mix — the decks, faders and FX move exactly
            how they played it.
          </p>
        </header>

        <MixPlayer
          slug={slug}
          songs={songs}
          program={{
            durationMs: mix.durationMs,
            events: mix.events as unknown as MixEvent[],
          }}
        />

        <div className="flex flex-col items-center gap-2 border-t border-black/10 pt-4 dark:border-white/10">
          <Link
            href="/dj"
            className="rounded-full bg-[#F760D6] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            🎧 Make your own mix
          </Link>
          <Link
            href="/listen"
            className="text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            Or hear the songs on their own
          </Link>
        </div>
      </main>
    </div>
  );
}
