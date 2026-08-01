"use client";

import { PodcastEpisodeBadge } from "./PodcastEpisodeBadge";
import { usePlayer } from "./PlayerProvider";

export function NowPlayingBar() {
  const { currentSong, isPlaying, togglePlay } = usePlayer();

  if (!currentSong) return null;

  return (
    <div className="sticky bottom-0 z-40 border-t border-black/10 bg-background/95 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            {isPlaying ? (
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

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {currentSong.title}
            </p>
            <p className="truncate text-xs text-black/60 dark:text-white/60">
              {currentSong.artistName}
            </p>
          </div>
        </div>

        <PodcastEpisodeBadge
          podcastEpisodeTitle={currentSong.podcastEpisodeTitle}
          podcastEpisodeUrl={currentSong.podcastEpisodeUrl}
        />
      </div>
    </div>
  );
}
