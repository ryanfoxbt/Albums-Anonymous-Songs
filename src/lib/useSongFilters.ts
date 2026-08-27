import { useMemo, useState } from "react";
import type {
  ArtistSummary,
  CategorySummary,
  GenreSummary,
  SongWithRelations,
} from "@/lib/songs";

export const ALL = "all";

export type SongSort = "newest" | "popular" | "title";

export const SONG_SORTS: { value: SongSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "title", label: "A–Z" },
];

export type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

export function useSongFilters(
  songs: SongWithRelations[],
  artists: ArtistSummary[],
  genres: GenreSummary[],
  categories: CategorySummary[],
) {
  const [search, setSearch] = useState("");
  const [artist, setArtist] = useState(ALL);
  const [genre, setGenre] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [sort, setSort] = useState<SongSort>("newest");

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = songs.filter((song) => {
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

    return [...matched].sort((a, b) => {
      if (sort === "popular") {
        const diff = (b.playCount ?? 0) - (a.playCount ?? 0);
        return diff !== 0 ? diff : a.title.localeCompare(b.title);
      }
      if (sort === "title") return a.title.localeCompare(b.title);
      // "newest"
      const diff = b.createdAt.localeCompare(a.createdAt);
      return diff !== 0 ? diff : a.title.localeCompare(b.title);
    });
  }, [songs, search, artist, genre, category, sort]);

  const clearAll = () => {
    setSearch("");
    setArtist(ALL);
    setGenre(ALL);
    setCategory(ALL);
    setSort("newest");
  };

  const activeFilters = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
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

  return {
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
    filteredSongs,
    activeFilters,
    clearAll,
  };
}
