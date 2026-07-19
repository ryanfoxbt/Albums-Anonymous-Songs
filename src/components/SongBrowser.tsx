"use client";

import { useMemo, useState } from "react";
import type {
  ArtistSummary,
  CategorySummary,
  GenreSummary,
  SongWithRelations,
} from "@/lib/songs";
import { SongCard } from "./SongCard";

const ALL = "all";

export function SongBrowser({
  songs,
  artists,
  genres,
  categories,
}: {
  songs: SongWithRelations[];
  artists: ArtistSummary[];
  genres: GenreSummary[];
  categories: CategorySummary[];
}) {
  const [search, setSearch] = useState("");
  const [artist, setArtist] = useState(ALL);
  const [genre, setGenre] = useState(ALL);
  const [category, setCategory] = useState(ALL);

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return songs.filter((song) => {
      const matchesQuery =
        query.length === 0 ||
        song.title.toLowerCase().includes(query) ||
        song.artist.name.toLowerCase().includes(query);
      const matchesArtist = artist === ALL || song.artistId === artist;
      const matchesGenre = genre === ALL || song.genreId === genre;
      const matchesCategory =
        category === ALL || song.categoryId === category;
      return matchesQuery && matchesArtist && matchesGenre && matchesCategory;
    });
  }, [songs, search, artist, genre, category]);

  const clearAll = () => {
    setSearch("");
    setArtist(ALL);
    setGenre(ALL);
    setCategory(ALL);
  };

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (search.trim()) {
      chips.push({
        key: "search",
        label: `"${search.trim()}"`,
        onRemove: () => setSearch(""),
      });
    }
    if (artist !== ALL) {
      chips.push({
        key: "artist",
        label: artists.find((a) => a.id === artist)?.name ?? "Artist",
        onRemove: () => setArtist(ALL),
      });
    }
    if (genre !== ALL) {
      chips.push({
        key: "genre",
        label: genres.find((g) => g.id === genre)?.name ?? "Genre",
        onRemove: () => setGenre(ALL),
      });
    }
    if (category !== ALL) {
      chips.push({
        key: "category",
        label: categories.find((c) => c.id === category)?.name ?? "Category",
        onRemove: () => setCategory(ALL),
      });
    }
    return chips;
  }, [search, artist, genre, category, artists, genres, categories]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by song or artist..."
          className="w-full rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />

        <div className="grid grid-cols-3 gap-2">
          <select
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            className="rounded-full border border-black/15 px-2 py-2 text-xs dark:border-white/20 dark:bg-transparent"
          >
            <option value={ALL}>All artists</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            className="rounded-full border border-black/15 px-2 py-2 text-xs dark:border-white/20 dark:bg-transparent"
          >
            <option value={ALL}>All genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-full border border-black/15 px-2 py-2 text-xs dark:border-white/20 dark:bg-transparent"
          >
            <option value={ALL}>All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 text-xs hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
              >
                {chip.label}
                <span aria-hidden>×</span>
              </button>
            ))}
            {activeFilters.length > 1 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-black/60 underline hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {filteredSongs.length === 0 ? (
        <div className="py-8 text-center text-sm text-black/60 dark:text-white/60">
          <p>
            {activeFilters.length > 0
              ? "No songs match your filters."
              : "No songs match your search."}
          </p>
          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 underline hover:text-black dark:hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </ul>
      )}
    </div>
  );
}
