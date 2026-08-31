import { readFileSync } from "node:fs";
import path from "node:path";

// Podcast episodes that have original songs on this site. Data is curated
// in content/episodes.json (episode number, album covered, guest, publish
// date, duration) from the show's own feeds; the YouTube video id links
// each episode to its songs — a song belongs to an episode when the id in
// its podcastEpisodeUrl matches episode.youTubeId.

export type Episode = {
  number: number;
  slug: string;
  title: string;
  albumTitle: string | null;
  albumArtist: string | null;
  albumYear: number | null;
  guest: string | null;
  /** ISO date (YYYY-MM-DD). */
  publishedAt: string;
  durationMinutes: number;
  youTubeId: string;
  description: string;
};

let cache: Episode[] | null = null;

function loadEpisodes(): Episode[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), "content", "episodes.json");
  const parsed = JSON.parse(readFileSync(file, "utf-8")) as {
    episodes: Episode[];
  };
  cache = [...parsed.episodes].sort((a, b) => b.number - a.number);
  return cache;
}

export function getEpisodes(): Episode[] {
  return loadEpisodes();
}

export function getEpisodeBySlug(slug: string): Episode | undefined {
  return loadEpisodes().find((episode) => episode.slug === slug);
}

/** Pull the 11-char YouTube id out of a youtu.be/ or watch?v= URL. */
export function youTubeIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

/** The episode a song was first heard on, matched via its podcastEpisodeUrl. */
export function episodeForSong(song: {
  podcastEpisodeUrl: string | null;
}): Episode | undefined {
  const id = youTubeIdFromUrl(song.podcastEpisodeUrl);
  if (!id) return undefined;
  return loadEpisodes().find((episode) => episode.youTubeId === id);
}

export function watchUrl(episode: Episode): string {
  return `https://www.youtube.com/watch?v=${episode.youTubeId}`;
}

export function thumbnailUrl(episode: Episode): string {
  return `https://i.ytimg.com/vi/${episode.youTubeId}/hqdefault.jpg`;
}
