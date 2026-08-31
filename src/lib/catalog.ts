// Faceted views over the song catalogue — artist / genre / category
// landing pages and their sitemap/static-params lists. Everything is built
// on getSongs(), which already applies the hidden filter and the
// content/songs.json fallback, so these helpers inherit both.

import {
  getArtists,
  getCategories,
  getGenres,
  getSongs,
  type ArtistSummary,
  type CategorySummary,
  type GenreSummary,
  type SongWithRelations,
} from "@/lib/songs";

export type FacetListItem = {
  slug: string;
  name: string;
  songCount: number;
};

export type ArtistPage = {
  artist: ArtistSummary;
  songs: SongWithRelations[];
  /** Genres this artist's songs span, most common first. */
  genres: string[];
};

export type GenrePage = {
  genre: GenreSummary;
  songs: SongWithRelations[];
  artists: string[];
};

export type CategoryPage = {
  category: CategorySummary;
  songs: SongWithRelations[];
  genres: string[];
};

function countBy<T>(items: T[], key: (item: T) => string): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

export async function getArtistsWithSongs(): Promise<FacetListItem[]> {
  const songs = await getSongs({ sortBy: "title" });
  const counts = new Map<string, { name: string; count: number }>();
  for (const song of songs) {
    for (const credited of [song.artist, song.featuredArtist]) {
      if (!credited) continue;
      const entry = counts.get(credited.slug) ?? { name: credited.name, count: 0 };
      entry.count += 1;
      counts.set(credited.slug, entry);
    }
  }
  return [...counts.entries()]
    .map(([slug, { name, count }]) => ({ slug, name, songCount: count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGenresWithSongs(): Promise<FacetListItem[]> {
  const songs = await getSongs({ sortBy: "title" });
  const counts = new Map<string, { name: string; count: number }>();
  for (const song of songs) {
    const entry = counts.get(song.genre.slug) ?? { name: song.genre.name, count: 0 };
    entry.count += 1;
    counts.set(song.genre.slug, entry);
  }
  return [...counts.entries()]
    .map(([slug, { name, count }]) => ({ slug, name, songCount: count }))
    .sort((a, b) => b.songCount - a.songCount || a.name.localeCompare(b.name));
}

export async function getCategoriesWithSongs(): Promise<FacetListItem[]> {
  const songs = await getSongs({ sortBy: "title" });
  const counts = new Map<string, { name: string; count: number }>();
  for (const song of songs) {
    const entry =
      counts.get(song.category.slug) ?? { name: song.category.name, count: 0 };
    entry.count += 1;
    counts.set(song.category.slug, entry);
  }
  return [...counts.entries()]
    .map(([slug, { name, count }]) => ({ slug, name, songCount: count }))
    .sort((a, b) => b.songCount - a.songCount || a.name.localeCompare(b.name));
}

export async function getArtistPage(slug: string): Promise<ArtistPage | null> {
  const [artists, songs] = await Promise.all([
    getArtists(),
    getSongs({ sortBy: "newest" }),
  ]);
  const artist = artists.find((a) => a.slug === slug);
  if (!artist) return null;
  const facetSongs = songs.filter(
    (song) =>
      song.artist.slug === slug || song.featuredArtist?.slug === slug,
  );
  if (facetSongs.length === 0) return null;
  return {
    artist,
    songs: facetSongs,
    genres: countBy(facetSongs, (song) => song.genre.name),
  };
}

export async function getGenrePage(slug: string): Promise<GenrePage | null> {
  const [genres, songs] = await Promise.all([
    getGenres(),
    getSongs({ sortBy: "newest" }),
  ]);
  const genre = genres.find((g) => g.slug === slug);
  if (!genre) return null;
  const facetSongs = songs.filter((song) => song.genre.slug === slug);
  if (facetSongs.length === 0) return null;
  return {
    genre,
    songs: facetSongs,
    artists: countBy(facetSongs, (song) => song.artist.name),
  };
}

export async function getCategoryPage(slug: string): Promise<CategoryPage | null> {
  const [categories, songs] = await Promise.all([
    getCategories(),
    getSongs({ sortBy: "newest" }),
  ]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const facetSongs = songs.filter((song) => song.category.slug === slug);
  if (facetSongs.length === 0) return null;
  return {
    category,
    songs: facetSongs,
    genres: countBy(facetSongs, (song) => song.genre.name),
  };
}

/** Up to `limit` other songs sharing a genre with `song` (newest first). */
export async function getRelatedSongs(
  song: SongWithRelations,
  limit = 4,
): Promise<SongWithRelations[]> {
  const songs = await getSongs({ sortBy: "newest" });
  const sameGenre = songs.filter(
    (other) => other.id !== song.id && other.genre.slug === song.genre.slug,
  );
  const sameArtist = songs.filter(
    (other) =>
      other.id !== song.id &&
      other.artist.slug === song.artist.slug &&
      other.genre.slug !== song.genre.slug,
  );
  const seen = new Set<string>();
  const out: SongWithRelations[] = [];
  for (const candidate of [...sameArtist, ...sameGenre]) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    out.push(candidate);
    if (out.length >= limit) break;
  }
  return out;
}
