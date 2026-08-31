import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PodcastEpisodeBadge } from "@/components/player/PodcastEpisodeBadge";
import { SongCardList } from "@/components/SongCardList";
import { SongPagePlayer } from "@/components/SongPagePlayer";
import { formatArtistCredit } from "@/lib/artistCredit";
import { getRelatedSongs } from "@/lib/catalog";
import { episodeForSong } from "@/lib/episodes";
import { getSongBySlug, getSongs } from "@/lib/songs";
import { getSongSeo } from "@/lib/songSeo";
import { absoluteUrl, SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const songs = await getSongs({ sortBy: "title" });
  return songs.map((song) => ({ slug: song.slug }));
}

function isoDuration(seconds: number | null): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m}M${s}S`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) {
    return { title: "Song Not Found" };
  }

  const artistCredit = formatArtistCredit(song);
  const seo = getSongSeo(slug);
  const episodeNote = song.podcastEpisodeTitle
    ? ` First heard on: ${song.podcastEpisodeTitle}.`
    : "";

  const title = `${song.title} — ${artistCredit}`;
  const description =
    seo?.summary ??
    `"${song.title}" by ${artistCredit}, a funny ${song.genre.name.toLowerCase()} parody song from Albums Anonymous — funny original songs plus the comedy podcast where they're born.${episodeNote}`;

  return {
    title,
    description,
    keywords: seo?.searchTerms,
    alternates: { canonical: `/song/${slug}` },
    openGraph: {
      title,
      description,
      type: "music.song",
      url: absoluteUrl(`/song/${slug}`),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  const artistCredit = formatArtistCredit(song);
  const seo = getSongSeo(slug);
  const episode = episodeForSong(song);
  const related = await getRelatedSongs(song, 4);

  const musicRecordingJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: song.title,
    byArtist: { "@type": "MusicGroup", name: artistCredit },
    genre: song.genre.name,
    url: absoluteUrl(`/song/${song.slug}`),
    inLanguage: "en",
    datePublished: song.createdAt,
    duration: isoDuration(song.durationSeconds),
    image: song.coverImageUrl ?? undefined,
    publisher: {
      "@type": "Organization",
      name: "Permanent Records LLC",
      url: "https://www.permrecords.com/",
    },
    audio: {
      "@type": "AudioObject",
      contentUrl: song.audioUrl,
      encodingFormat: "audio/mpeg",
      ...(isoDuration(song.durationSeconds)
        ? { duration: isoDuration(song.durationSeconds) }
        : {}),
    },
    ...(seo
      ? {
          description: seo.summary,
          abstract: seo.about,
          keywords: seo.searchTerms.join(", "),
        }
      : {}),
    ...(episode
      ? {
          isPartOf: {
            "@type": "PodcastEpisode",
            name: episode.title,
            url: absoluteUrl(`/podcast/${episode.slug}`),
          },
        }
      : {}),
    ...(song.lyrics
      ? {
          recordingOf: {
            "@type": "MusicComposition",
            name: song.title,
            lyrics: { "@type": "CreativeWork", text: song.lyrics },
          },
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
        name: "Songs",
        item: absoluteUrl("/listen"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${song.genre.name} songs`,
        item: absoluteUrl(`/genre/${song.genre.slug}`),
      },
      {
        "@type": "ListItem",
        position: 4,
        name: song.title,
        item: absoluteUrl(`/song/${song.slug}`),
      },
    ],
  };

  const faqJsonLd =
    seo && seo.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: seo.faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }
      : null;

  const speakableJsonLd = seo
    ? {
        "@context": "https://schema.org",
        "@type": "WebPage",
        url: absoluteUrl(`/song/${song.slug}`),
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["#about-this-song", "#song-faq"],
        },
      }
    : null;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(musicRecordingJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      {speakableJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableJsonLd) }}
        />
      )}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <nav className="text-xs text-black/50 dark:text-white/50">
          <Link href="/listen" className="underline hover:text-foreground">
            All songs
          </Link>{" "}
          /{" "}
          <Link
            href={`/genre/${song.genre.slug}`}
            className="underline hover:text-foreground"
          >
            {song.genre.name}
          </Link>{" "}
          / <span>{song.title}</span>
        </nav>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{song.title}</h1>
          <p className="text-base font-medium text-[#F760D6]">
            <Link
              href={`/artist/${song.artist.slug}`}
              className="hover:underline"
            >
              {song.artist.name}
            </Link>
            {song.featuredArtist && (
              <>
                {" Featuring "}
                <Link
                  href={`/artist/${song.featuredArtist.slug}`}
                  className="hover:underline"
                >
                  {song.featuredArtist.name}
                </Link>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href={`/genre/${song.genre.slug}`}
              className="rounded-full bg-black/5 px-2 py-1 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            >
              {song.genre.name}
            </Link>
            <Link
              href={`/category/${song.category.slug}`}
              className="rounded-full bg-black/5 px-2 py-1 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            >
              {song.category.name}
            </Link>
          </div>
        </header>

        <SongPagePlayer song={song} />

        <Link
          href={`/dj?load=${song.id}`}
          className="self-start rounded-full border border-[#F760D6]/40 bg-[#F760D6]/10 px-3 py-1.5 text-xs font-medium text-[#F760D6] hover:bg-[#F760D6]/20"
        >
          🎧 Load this in the DJ Booth
        </Link>

        <PodcastEpisodeBadge
          songId={song.id}
          podcastEpisodeTitle={song.podcastEpisodeTitle}
          podcastEpisodeUrl={song.podcastEpisodeUrl}
        />

        {episode && (
          <p className="text-sm text-black/60 dark:text-white/60">
            First heard on{" "}
            <Link
              href={`/podcast/${episode.slug}`}
              className="underline hover:text-foreground"
            >
              Episode {episode.number}: {episode.title}
            </Link>
            {episode.albumTitle &&
              ` — the ${episode.albumArtist} / ${episode.albumTitle} episode`}
            .
          </p>
        )}

        {seo && (
          <section
            id="about-this-song"
            className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10"
          >
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
              About this song
            </h2>
            <p className="text-sm leading-relaxed text-black/80 dark:text-white/80">
              {seo.about}
            </p>
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-medium text-black/50 dark:text-white/50">
                People find “{song.title}” searching for
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {seo.searchTerms.map((term) => (
                  <li
                    key={term}
                    className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/70 dark:bg-white/10 dark:text-white/70"
                  >
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {song.lyrics && (
          <section className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
              Lyrics
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/80 dark:text-white/80">
              {song.lyrics}
            </p>
          </section>
        )}

        {seo && seo.faq.length > 0 && (
          <section
            id="song-faq"
            className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10"
          >
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
              Common questions about “{song.title}”
            </h2>
            <dl className="flex flex-col gap-3">
              {seo.faq.map((item) => (
                <div key={item.q} className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-black/80 dark:text-white/80">
                    {item.q}
                  </dt>
                  <dd className="text-sm leading-relaxed text-black/70 dark:text-white/70">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {related.length > 0 && (
          <section className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
              More like this
            </h2>
            <SongCardList songs={related} />
          </section>
        )}
      </main>
    </div>
  );
}
