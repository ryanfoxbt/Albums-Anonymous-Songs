"use client";

import { useMemo, useState } from "react";
import { EmailGateDialog } from "@/components/EmailGateDialog";
import { isEmailUnlocked } from "@/lib/emailGate";
import { DJ_DRAG_MIME, type DjSong } from "./types";

type ListedFilter = "all" | "listed" | "unlisted";
type SortOrder = "title" | "newest" | "popular";

export function SongBrowser({
  songs,
  onLoad,
}: {
  songs: DjSong[];
  onLoad: (deck: "A" | "B", songId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListedFilter>("all");
  const [sort, setSort] = useState<SortOrder>("title");
  const [unlistedGateOpen, setUnlistedGateOpen] = useState(false);

  const selectFilter = (f: ListedFilter) => {
    if (f === "unlisted" && !isEmailUnlocked()) {
      setUnlistedGateOpen(true);
      return;
    }
    setFilter(f);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = songs.filter((song) => {
      if (filter === "listed" && song.hidden) return false;
      if (filter === "unlisted" && !song.hidden) return false;
      if (!q) return true;
      return (
        song.title.toLowerCase().includes(q) ||
        song.artistName.toLowerCase().includes(q)
      );
    });
    if (sort === "popular") {
      return [...matches].sort((a, b) => b.playCount - a.playCount);
    }
    if (sort === "newest") {
      return [...matches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return matches;
  }, [songs, query, filter, sort]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 rounded-2xl border border-black/10 p-3 dark:border-white/10">
      <p className="text-xs font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
        Tracks
      </p>

      <input
        type="search"
        placeholder="Search songs…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-full border border-black/15 bg-transparent px-3 py-1.5 text-xs outline-none focus:border-foreground dark:border-white/20"
      />
      <div className="flex gap-1 text-[10px]">
        {(["all", "listed", "unlisted"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => selectFilter(f)}
            className={`rounded-full border px-2.5 py-1 font-medium capitalize ${
              filter === f
                ? "border-foreground bg-foreground text-background"
                : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex gap-1 text-[10px]">
        {([
          ["title", "A–Z"],
          ["newest", "Newest"],
          ["popular", "Most popular"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSort(value)}
            className={`rounded-full border px-2.5 py-1 font-medium ${
              sort === value
                ? "border-foreground bg-foreground text-background"
                : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {filtered.map((song) => (
          <li
            key={song.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DJ_DRAG_MIME, song.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="flex cursor-grab flex-col gap-1 rounded-xl border border-transparent p-2 text-xs hover:border-black/10 hover:bg-black/5 active:cursor-grabbing dark:hover:border-white/10 dark:hover:bg-white/10"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-medium">
                {song.title}
                {song.hidden && (
                  <span className="shrink-0 rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-normal text-black/60 dark:bg-white/10 dark:text-white/60">
                    Unlisted
                  </span>
                )}
              </p>
              <p className="truncate text-[11px] text-black/50 dark:text-white/50">
                {song.artistName}
                {sort === "popular" &&
                  ` · ${song.playCount} play${song.playCount === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onLoad("A", song.id)}
                className="flex-1 rounded-full border border-black/15 py-1 text-[10px] font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                → A
              </button>
              <button
                type="button"
                onClick={() => onLoad("B", song.id)}
                className="flex-1 rounded-full border border-black/15 py-1 text-[10px] font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                → B
              </button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="p-2 text-xs text-black/50 dark:text-white/50">
            No songs match.
          </p>
        )}
      </ul>
      </div>

      <EmailGateDialog
        open={unlistedGateOpen}
        reason="unlisted"
        onClose={() => setUnlistedGateOpen(false)}
        onUnlocked={() => {
          setUnlistedGateOpen(false);
          setFilter("unlisted");
        }}
      />
    </>
  );
}
