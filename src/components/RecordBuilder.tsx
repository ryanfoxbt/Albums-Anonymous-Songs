"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatArtistCredit } from "@/lib/artistCredit";
import type {
  ArtistSummary,
  CategorySummary,
  GenreSummary,
  SongWithRelations,
} from "@/lib/songs";
import { editTokenStorageKey } from "@/lib/recordEditStorage";
import { useSongFilters } from "@/lib/useSongFilters";
import { SongFilterControls } from "./SongFilterControls";

const MAX_TRACKS = 10;

export function RecordBuilder({
  songs,
  artists,
  genres,
  categories,
  mode = "create",
  slug,
  editToken,
  initialSelectedIds = [],
}: {
  songs: SongWithRelations[];
  artists: ArtistSummary[];
  genres: GenreSummary[];
  categories: CategorySummary[];
  mode?: "create" | "edit";
  slug?: string;
  editToken?: string;
  initialSelectedIds?: string[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [newSlug, setNewSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const filters = useSongFilters(songs, artists, genres, categories);
  const { filteredSongs } = filters;

  const selectedSongs = selectedIds
    .map((id) => songs.find((song) => song.id === id))
    .filter((song) => song !== undefined);

  const toggleSong = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((songId) => songId !== id);
      }
      if (current.length >= MAX_TRACKS) return current;
      return [...current, id];
    });
  };

  const moveSong = (index: number, direction: -1 | 1) => {
    setSelectedIds((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeSong = (id: string) => {
    setSelectedIds((current) => current.filter((songId) => songId !== id));
  };

  const handleCreate = async () => {
    const response = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songIds: selectedIds,
        slug: newSlug.trim() || undefined,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    window.localStorage.setItem(
      editTokenStorageKey(data.slug),
      data.editToken,
    );
    router.push(`/record/${data.slug}`);
  };

  const handleSaveEdit = async () => {
    const response = await fetch(`/api/records/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songIds: selectedIds, editToken }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push(`/record/${slug}`);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (mode === "edit") {
        await handleSaveEdit();
      } else {
        await handleCreate();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {selectedSongs.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-sm font-semibold leading-tight">
            Side A — {selectedSongs.length}/{MAX_TRACKS} tracks
          </p>
          <ol className="flex flex-col gap-1">
            {selectedSongs.map((song, index) => (
              <li key={song.id} className="flex items-center gap-1 text-sm">
                <span className="w-4 shrink-0 text-black/40 dark:text-white/40">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {song.title}{" "}
                  <span className="text-black/50 dark:text-white/50">
                    — {formatArtistCredit(song)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => moveSong(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${song.title} up`}
                  className="touch-manipulation p-2 text-black/40 hover:text-black disabled:opacity-30 dark:text-white/40 dark:hover:text-white"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSong(index, 1)}
                  disabled={index === selectedSongs.length - 1}
                  aria-label={`Move ${song.title} down`}
                  className="touch-manipulation p-2 text-black/40 hover:text-black disabled:opacity-30 dark:text-white/40 dark:hover:text-white"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeSong(song.id)}
                  aria-label={`Remove ${song.title}`}
                  className="touch-manipulation p-2 text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>

          {mode === "create" ? (
            <div className="mt-2 flex flex-col gap-1">
              <label
                htmlFor="record-slug"
                className="text-xs text-black/50 dark:text-white/50"
              >
                Custom URL (optional)
              </label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-black/40 dark:text-white/40">
                  /record/
                </span>
                <input
                  id="record-slug"
                  type="text"
                  value={newSlug}
                  onChange={(event) => setNewSlug(event.target.value)}
                  placeholder="my-summer-jams"
                  className="min-w-0 flex-1 rounded-full border border-black/15 px-3 py-1 text-sm dark:border-white/20 dark:bg-transparent"
                />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-black/50 dark:text-white/50">
              /record/{slug}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 inline-flex touch-manipulation items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
          >
            {mode === "edit"
              ? submitting
                ? "Saving..."
                : "Save Changes"
              : submitting
                ? "Pressing..."
                : "Press Record"}
          </button>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      <SongFilterControls
        filters={filters}
        artists={artists}
        genres={genres}
        categories={categories}
      />

      {filteredSongs.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/60 dark:text-white/60">
          No songs match your filters.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredSongs.map((song) => {
            const checked = selectedIds.includes(song.id);
            const disabled = !checked && selectedIds.length >= MAX_TRACKS;
            return (
              <li key={song.id}>
                <label
                  className={`flex touch-manipulation items-center gap-3 rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10 ${
                    disabled
                      ? "opacity-40"
                      : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleSong(song.id)}
                    className="h-5 w-5"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{song.title}</span>{" "}
                    <span className="text-[#F760D6]">
                      {formatArtistCredit(song)}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
