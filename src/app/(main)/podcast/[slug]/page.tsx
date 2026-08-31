import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SongCardList } from "@/components/SongCardList";
import {
  getEpisodeBySlug,
  getEpisodes,
  episodeForSong,
  thumbnailUrl,
  watchUrl,
} from "@/lib/episodes";
import { PODCAST_PLATFORMS } from "@/lib/podcastPlatforms";
import { getSongs } from "@/lib/songs";
import { absoluteUrl, SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return getEpisodes().map((episode) => ({ slug: episode.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) return { title: "Episode Not Found" };

  const title = `Ep. ${episode.number}: ${episode.title}`;
  const description = episode.description;

  return {
    title,
    description,
    alternates: { canonical: `/podcast/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: absoluteUrl(`/podcast/${slug}`),
      images: [thumbnailUrl(episode)],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) notFound();

  const allSongs = await getSongs({ sortBy: "newest" });
  const episodeSongs = allSongs.filter(
    (song) => episodeForSong(song)?.slug === slug,
  );

  const publishedIso = new Date(`${episode.publishedAt}T12:00:00Z`).toISOString();
  const albumLine = episode.albumTitle
    ? `${episode.albumTitle} by ${episode.albumArtist}${
        episode.albumYear ? ` (${episode.albumYear})` : ""
      }`
    : null;

  const episodeJsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    episodeNumber: episode.number,
    url: absoluteUrl(`/podcast/${slug}`),
    datePublished: publishedIso,
    timeRequired: `PT${episode.durationMinutes}M`,
    description: episode.description,
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: watchUrl(episode),
    },
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "Albums Anonymous",
      url: absoluteUrl("/podcast"),
    },
    ...(episodeSongs.length > 0
      ? {
          workExample: episodeSongs.map((song) => ({
            "@type": "MusicRecording",
            name: song.title,
            url: absoluteUrl(`/song/${song.slug}`),
          })),
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Podcast",
        item: absoluteUrl("/podcast"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `Ep. ${episode.number}`,
        item: absoluteUrl(`/podcast/${slug}`),
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(episodeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <nav className="text-xs text-black/50 dark:text-white/50">
          <Link href="/podcast" className="underline hover:text-foreground">
            Podcast
          </Link>{" "}
          / <span>Episode {episode.number}</span>
        </nav>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{episode.title}</h1>
          <p className="text-xs text-black/50 dark:text-white/50">
            Episode {episode.number} ·{" "}
            {new Date(publishedIso).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}{" "}
            · {episode.durationMinutes} min
            {episode.guest && ` · with ${episode.guest}`}
          </p>
        </header>

        <a
          href={watchUrl(episode)}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl(episode)}
            alt={`Albums Anonymous episode ${episode.number}: ${episode.title}`}
            width={480}
            height={360}
            loading="lazy"
            className="aspect-video w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white group-hover:bg-black/85">
              ▶ Watch on YouTube
            </span>
          </span>
        </a>

        <p className="text-sm leading-relaxed text-black/80 dark:text-white/80">
          {episode.description}
        </p>

        {albumLine && (
          <div className="rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
            <span className="text-black/50 dark:text-white/50">
              Album discussed
            </span>
            <p className="font-medium">{albumLine}</p>
          </div>
        )}

        {episodeSongs.length > 0 && (
          <section className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
              Songs from this episode
            </h2>
            <SongCardList songs={episodeSongs} />
          </section>
        )}

        <div className="flex flex-wrap gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          {PODCAST_PLATFORMS.map((platform) => (
            <a
              key={platform.name}
              href={platform.name === "YouTube" ? watchUrl(episode) : platform.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              {platform.name === "YouTube"
                ? "Watch this episode"
                : `Find it on ${platform.name}`}
            </a>
          ))}
        </div>

        <p className="text-sm text-black/60 dark:text-white/60">
          <Link href="/podcast" className="underline hover:text-foreground">
            ← All episodes with songs
          </Link>
        </p>
      </main>
    </div>
  );
}
