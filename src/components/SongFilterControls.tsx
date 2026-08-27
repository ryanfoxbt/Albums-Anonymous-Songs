"use client";

import type {
  ArtistSummary,
  CategorySummary,
  GenreSummary,
} from "@/lib/songs";
import { ALL, SONG_SORTS, type useSongFilters } from "@/lib/useSongFilters";

export function SongFilterControls({
  filters,
  artists,
  genres,
  categories,
}: {
  filters: ReturnType<typeof useSongFilters>;
  artists: ArtistSummary[];
  genres: GenreSummary[];
  categories: CategorySummary[];
}) {
  const {
    search,
    setSearch,
    artist,
    setArtist,
    genre,
    setGenre,
    category,
    setCategory,
    sort,
    setSort,
    activeFilters,
    clearAll,
  } = filters;

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by song or artist..."
        className="w-full rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/20 dark:bg-transparent"
      />

      <div className="flex items-center gap-1.5">
        <span className="mr-0.5 text-xs text-black/50 dark:text-white/50">
          Sort
        </span>
        {SONG_SORTS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSort(option.value)}
            aria-pressed={sort === option.value}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              sort === option.value
                ? "border-foreground bg-foreground text-background"
                : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

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
  );
}
