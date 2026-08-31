"use client";

import Link from "next/link";
import { buildContinuousQueue } from "@/lib/continuousPlay";
import { isNewSong } from "@/lib/newSong";
import { toPlayerSong } from "@/lib/playerSong";
import type { SongWithRelations } from "@/lib/songs";
import { AudioPlayer } from "./AudioPlayer";
import { DownloadButton } from "./DownloadButton";
import { usePlayer } from "./player/PlayerProvider";

export function SongCard({
  song,
  allSongs,
}: {
  song: SongWithRelations;
  allSongs: SongWithRelations[];
}) {
  const { currentSong, playQueue, togglePlay } = usePlayer();
  const isNew = isNewSong(song.createdAt);

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
        <h3 className="flex items-center gap-2 font-semibold leading-tight">
          <Link href={`/song/${song.slug}`} className="hover:underline">
            {song.title}
          </Link>
          {isNew && (
            <span className="shrink-0 rounded-full bg-[#F760D6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              New
            </span>
          )}
        </h3>
        <p className="text-sm text-[#F760D6]">
          <Link href={`/artist/${song.artist.slug}`} className="hover:underline">
            {song.artist.name}
          </Link>
          {song.featuredArtist && (
            <>
              {" Featuring "}
              <Link
                href={`/artist/${song.featuredArtist.slug}`}
                className="hover:underline"
              >
                {song.featuredArtist.name}
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href={`/genre/${song.genre.slug}`}
          className="rounded-full bg-black/5 px-2 py-1 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
        >
          {song.genre.name}
        </Link>
        <Link
          href={`/category/${song.category.slug}`}
          className="rounded-full bg-black/5 px-2 py-1 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
        >
          {song.category.name}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AudioPlayer songId={song.id} title={song.title} onPlay={handlePlay} />
        <DownloadButton slug={song.slug} />
      </div>
    </li>
  );
}
