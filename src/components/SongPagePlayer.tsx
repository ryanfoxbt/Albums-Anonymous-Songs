"use client";

import { AudioPlayer } from "./AudioPlayer";
import { DownloadButton } from "./DownloadButton";
import { toPlayerSong } from "@/lib/playerSong";
import type { SongWithRelations } from "@/lib/songs";
import { usePlayer } from "./player/PlayerProvider";

export function SongPagePlayer({ song }: { song: SongWithRelations }) {
  const { currentSong, isPlaying, playSong } = usePlayer();
  const isThisPlaying = currentSong?.id === song.id && isPlaying;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <AudioPlayer
        songId={song.id}
        title={song.title}
        onPlay={() => playSong(toPlayerSong(song))}
      />
      <span className="text-sm text-black/60 dark:text-white/60">
        {isThisPlaying ? "Now playing" : "Play this song"}
      </span>
      <DownloadButton slug={song.slug} />
    </div>
  );
}
