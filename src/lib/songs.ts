import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export type ArtistSummary = {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
};
export type GenreSummary = { id: string; name: string; slug: string };
export type CategorySummary = { id: string; name: string; slug: string };

export type SongWithRelations = {
  id: string;
  title: string;
  slug: string;
  audioUrl: string;
  downloadUrl: string;
  durationSeconds: number | null;
  coverImageUrl: string | null;
  artistId: string;
  genreId: string;
  categoryId: string;
  artist: ArtistSummary;
  genre: GenreSummary;
  category: CategorySummary;
};

type SongsContent = {
  artists: { name: string; slug: string; bio?: string }[];
  genres: { name: string; slug: string }[];
  categories: { name: string; slug: string }[];
  songs: {
    title: string;
    slug: string;
    artist: string;
    genre: string;
    category: string;
    audioUrl: string;
    downloadUrl: string;
    durationSeconds?: number;
    coverImageUrl?: string;
  }[];
};

let cachedContent: SongsContent | null = null;

function readContent(): SongsContent {
  if (cachedContent) return cachedContent;
  const contentPath = path.join(process.cwd(), "content", "songs.json");
  const parsed: SongsContent = JSON.parse(readFileSync(contentPath, "utf-8"));
  cachedContent = parsed;
  return parsed;
}

function warnFallback(context: string, error?: unknown) {
  const reason =
    error instanceof Error ? error.message : "DATABASE_URL is not set";
  console.warn(
    `[songs] Database unavailable, falling back to content/songs.json for ${context} — ${reason}`,
  );
}

function fallbackArtists(): ArtistSummary[] {
  return readContent().artists.map((a) => ({
    id: a.slug,
    name: a.name,
    slug: a.slug,
    bio: a.bio ?? null,
  }));
}

function fallbackGenres(): GenreSummary[] {
  return readContent().genres.map((g) => ({
    id: g.slug,
    name: g.name,
    slug: g.slug,
  }));
}

function fallbackCategories(): CategorySummary[] {
  return readContent().categories.map((c) => ({
    id: c.slug,
    name: c.name,
    slug: c.slug,
  }));
}

function fallbackSongs(): SongWithRelations[] {
  const content = readContent();
  const artists = fallbackArtists();
  const genres = fallbackGenres();
  const categories = fallbackCategories();

  return content.songs.map((song) => {
    const artist = artists.find((a) => a.slug === song.artist);
    const genre = genres.find((g) => g.slug === song.genre);
    const category = categories.find((c) => c.slug === song.category);
    if (!artist || !genre || !category) {
      throw new Error(
        `content/songs.json: song "${song.slug}" references an unknown artist/genre/category`,
      );
    }
    return {
      id: song.slug,
      title: song.title,
      slug: song.slug,
      audioUrl: song.audioUrl,
      downloadUrl: song.downloadUrl,
      durationSeconds: song.durationSeconds ?? null,
      coverImageUrl: song.coverImageUrl ?? null,
      artistId: artist.id,
      genreId: genre.id,
      categoryId: category.id,
      artist,
      genre,
      category,
    };
  });
}

export async function getSongs(): Promise<SongWithRelations[]> {
  if (!process.env.DATABASE_URL) {
    warnFallback("songs");
    return fallbackSongs();
  }
  try {
    return await prisma.song.findMany({
      include: { artist: true, genre: true, category: true },
      orderBy: { title: "asc" },
    });
  } catch (error) {
    warnFallback("songs", error);
    return fallbackSongs();
  }
}

export async function getArtists(): Promise<ArtistSummary[]> {
  if (!process.env.DATABASE_URL) {
    warnFallback("artists");
    return fallbackArtists();
  }
  try {
    return await prisma.artist.findMany({ orderBy: { name: "asc" } });
  } catch (error) {
    warnFallback("artists", error);
    return fallbackArtists();
  }
}

export async function getGenres(): Promise<GenreSummary[]> {
  if (!process.env.DATABASE_URL) {
    warnFallback("genres");
    return fallbackGenres();
  }
  try {
    return await prisma.genre.findMany({ orderBy: { name: "asc" } });
  } catch (error) {
    warnFallback("genres", error);
    return fallbackGenres();
  }
}

export async function getCategories(): Promise<CategorySummary[]> {
  if (!process.env.DATABASE_URL) {
    warnFallback("categories");
    return fallbackCategories();
  }
  try {
    return await prisma.category.findMany({ orderBy: { name: "asc" } });
  } catch (error) {
    warnFallback("categories", error);
    return fallbackCategories();
  }
}
