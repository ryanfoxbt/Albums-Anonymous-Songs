"use client";

import { usePlayer } from "./player/PlayerProvider";

export function AudioPlayer({
  songId,
  title,
  onPlay,
}: {
  songId: string;
  title: string;
  onPlay: () => void;
}) {
  const { currentSong, isPlaying } = usePlayer();
  const isThisPlaying = currentSong?.id === songId && isPlaying;

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={isThisPlaying ? `Pause ${title}` : `Play ${title}`}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
    >
      {isThisPlaying ? (
        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
          <rect x="3" y="2" width="3.5" height="12" rx="0.5" />
          <rect x="9.5" y="2" width="3.5" height="12" rx="0.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M4 2.5v11l10-5.5-10-5.5z" />
        </svg>
      )}
    </button>
  );
}
