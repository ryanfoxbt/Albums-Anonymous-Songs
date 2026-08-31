import type { MetadataRoute } from "next";
import {
  getArtistsWithSongs,
  getCategoriesWithSongs,
  getGenresWithSongs,
} from "@/lib/catalog";
import { getEpisodes } from "@/lib/episodes";
import { getSongs } from "@/lib/songs";
import { SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [songs, artists, genres, categories] = await Promise.all([
    getSongs(),
    getArtistsWithSongs(),
    getGenresWithSongs(),
    getCategoriesWithSongs(),
  ]);
  const episodes = getEpisodes();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/listen`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/podcast`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/free-comedy-music`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ai-songs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/dj`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/dj/learn`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/press`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const songRoutes: MetadataRoute.Sitemap = songs.map((song) => ({
    url: `${SITE_URL}/song/${song.slug}`,
    lastModified: new Date(song.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const artistRoutes: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${SITE_URL}/artist/${artist.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const genreRoutes: MetadataRoute.Sitemap = genres.map((genre) => ({
    url: `${SITE_URL}/genre/${genre.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/category/${category.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  const episodeRoutes: MetadataRoute.Sitemap = episodes.map((episode) => ({
    url: `${SITE_URL}/podcast/${episode.slug}`,
    lastModified: new Date(`${episode.publishedAt}T12:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...songRoutes,
    ...artistRoutes,
    ...genreRoutes,
    ...categoryRoutes,
    ...episodeRoutes,
  ];
}
