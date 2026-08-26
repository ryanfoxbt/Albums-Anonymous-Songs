"use client";

import { useMemo, useState } from "react";
import { DJ_DRAG_MIME, type DjSong } from "./types";

type ListedFilter = "all" | "listed" | "unlisted";

export function SongBrowser({
  songs,
  onLoad,
}: {
  songs: DjSong[];
  onLoad: (deck: "A" | "B", songId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListedFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((song) => {
      if (filter === "listed" && song.hidden) return false;
      if (filter === "unlisted" && !song.hidden) return false;
      if (!q) return true;
      return (
        song.title.toLowerCase().includes(q) ||
        song.artistName.toLowerCase().includes(q)
      );
    });
  }, [songs, query, filter]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search songs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-full border border-black/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/20"
        />
        <div className="flex gap-1 text-xs">
          {(["all", "listed", "unlisted"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 font-medium capitalize ${
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {filtered.map((song) => (
          <li
            key={song.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DJ_DRAG_MIME, song.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="flex cursor-grab items-center gap-2 rounded-xl border border-transparent p-2 text-sm hover:border-black/10 hover:bg-black/5 active:cursor-grabbing dark:hover:border-white/10 dark:hover:bg-white/10"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-medium">
                {song.title}
                {song.hidden && (
                  <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-normal text-black/60 dark:bg-white/10 dark:text-white/60">
                    Unlisted
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-black/50 dark:text-white/50">
                {song.artistName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onLoad("A", song.id)}
              className="shrink-0 rounded-full border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              → A
            </button>
            <button
              type="button"
              onClick={() => onLoad("B", song.id)}
              className="shrink-0 rounded-full border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              → B
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="p-2 text-sm text-black/50 dark:text-white/50">
            No songs match.
          </p>
        )}
      </ul>
    </div>
  );
}
