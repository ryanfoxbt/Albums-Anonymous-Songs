"use client";

import Link from "next/link";
import { formatArtistCredit } from "@/lib/artistCredit";
import { buildContinuousQueue } from "@/lib/continuousPlay";
import { toPlayerSong } from "@/lib/playerSong";
import type { SongWithRelations } from "@/lib/songs";
import { AudioPlayer } from "./AudioPlayer";
import { usePlayer } from "./player/PlayerProvider";

export function SongCard({
  song,
  allSongs,
}: {
  song: SongWithRelations;
  allSongs: SongWithRelations[];
}) {
  const { currentSong, playQueue, togglePlay } = usePlayer();

  const handlePlay = () => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    const queue = buildContinuousQueue(allSongs, song).map(toPlayerSong);
    playQueue(queue, 0);
  };

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div>
        <h3 className="font-semibold leading-tight">
          <Link href={`/song/${song.slug}`} className="hover:underline">
            {song.title}
          </Link>
        </h3>
        <p className="text-sm text-[#F760D6]">{formatArtistCredit(song)}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
          {song.genre.name}
        </span>
        <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
          {song.category.name}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <AudioPlayer songId={song.id} title={song.title} onPlay={handlePlay} />
      </div>
    </li>
  );
}
