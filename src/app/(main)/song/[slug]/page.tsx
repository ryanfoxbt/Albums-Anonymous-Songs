import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PodcastEpisodeBadge } from "@/components/player/PodcastEpisodeBadge";
import { SongPagePlayer } from "@/components/SongPagePlayer";
import { formatArtistCredit } from "@/lib/artistCredit";
import { getSongBySlug } from "@/lib/songs";
import { getSongSeo } from "@/lib/songSeo";

export const dynamic = "force-dynamic";

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
    openGraph: { title, description },
    twitter: { title, description },
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

  const musicRecordingJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: song.title,
    byArtist: { "@type": "MusicGroup", name: artistCredit },
    genre: song.genre.name,
    url: `https://albumsanonymous.com/song/${song.slug}`,
    ...(seo
      ? {
          description: seo.summary,
          abstract: seo.about,
          keywords: seo.searchTerms.join(", "),
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

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(musicRecordingJsonLd),
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <Link
          href="/listen"
          className="text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          ← All songs
        </Link>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{song.title}</h1>
          <p className="text-base font-medium text-[#F760D6]">
            {artistCredit}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
              {song.genre.name}
            </span>
            <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
              {song.category.name}
            </span>
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

        {seo && (
          <section className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10">
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
          <section className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10">
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
      </main>
    </div>
  );
}
