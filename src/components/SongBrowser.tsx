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
      </div>

      {filteredSongs.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/60 dark:text-white/60">
          No songs match your search.
        </p>
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
