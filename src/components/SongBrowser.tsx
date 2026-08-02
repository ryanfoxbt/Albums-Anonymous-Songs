"use client";

import type {
  ArtistSummary,
  CategorySummary,
  GenreSummary,
  SongWithRelations,
} from "@/lib/songs";
import { useSongFilters } from "@/lib/useSongFilters";
import { SongCard } from "./SongCard";
import { SongFilterControls } from "./SongFilterControls";

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
  const filters = useSongFilters(songs, artists, genres, categories);
  const { filteredSongs, activeFilters, clearAll } = filters;

  return (
    <div className="flex flex-col gap-4">
      <SongFilterControls
        filters={filters}
        artists={artists}
        genres={genres}
        categories={categories}
      />

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
            <SongCard key={song.id} song={song} allSongs={songs} />
          ))}
        </ul>
      )}
    </div>
  );
}
