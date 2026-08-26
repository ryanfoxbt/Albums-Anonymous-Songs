"use client";

import type { DjSong } from "./types";

const BASE_SPIN_SECONDS = 1.8;

export function Turntable({
  song,
  isPlaying,
  tempo,
}: {
  song: DjSong | null;
  isPlaying: boolean;
  tempo: number;
}) {
  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center self-center">
      <div
        className="relative h-24 w-24 rounded-full border-[3px] border-black/20 dark:border-white/10"
        style={{
          background:
            "repeating-radial-gradient(circle at center, #27272a 0px, #27272a 2px, #18181b 2px, #18181b 4px)",
          animationName: "djSpin",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDuration: `${BASE_SPIN_SECONDS / tempo}s`,
          animationPlayState: isPlaying ? "running" : "paused",
        }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-black/40 bg-neutral-700">
          {song?.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-0.5 text-center text-[6px] font-medium leading-tight text-white/70">
              {song ? song.title : ""}
            </span>
          )}
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
        </div>
      </div>

      <div
        className="absolute right-2 top-0.5 h-14 w-1 origin-top-right rounded-full bg-black/70 transition-transform duration-500 ease-out dark:bg-white/60"
        style={{ transform: isPlaying ? "rotate(25deg)" : "rotate(-8deg)" }}
      >
        <div className="absolute -bottom-0.5 -left-1 h-2 w-3 rounded-sm bg-black/80 dark:bg-white/70" />
      </div>
    </div>
  );
}
