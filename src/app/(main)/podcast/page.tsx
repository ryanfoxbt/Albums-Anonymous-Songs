import Link from "next/link";
import type { Metadata } from "next";
import { PodcastPlatformIcon } from "@/components/icons/PodcastPlatformIcon";
import { EntryChoiceLink } from "@/components/landing/EntryChoiceLink";
import { getEpisodes } from "@/lib/episodes";
import { PODCAST_PLATFORMS } from "@/lib/podcastPlatforms";

const title = "The Podcast — An Album Club With a DJ Problem";
const description =
  "Every week Troy, Ryan, or a guest picks an album. Everyone actually listens to it. Then the comedy podcast Albums Anonymous talks about why, digs up the fun facts, and DJs funny look-alike and original songs from their label, Permanent Records LLC, in throughout the whole episode — never one segment at the end — to get you stoked to go listen to the album yourself.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "comedy podcast",
    "album club podcast",
    "unfiltered podcast",
    "funny podcast for dads",
    "podcast about albums",
    "music discussion podcast",
    "album review podcast",
    "unhinged podcast",
    "permanent records llc",
  ],
  alternates: { canonical: "/podcast" },
  openGraph: { title, description, url: "https://albumsanonymous.com/podcast" },
  twitter: { title, description },
};

const STEPS: { h: string; p: string }[] = [
  {
    h: "1. Someone picks an album",
    p: "Troy, Ryan, or a guest picks a record for the week — usually something with baggage. A classic everyone claims to know, a guilty pleasure, a record someone's been dying to defend.",
  },
  {
    h: "2. Everybody actually listens to it",
    p: "Unlike your wife's book club, they really do the homework. The whole album, all the way through, before a single word gets recorded.",
  },
  {
    h: "3. Why this album, though?",
    p: "This isn't a track-by-track dissection like a lot of album podcasts. They ask whoever picked it why they picked it and what the album actually means to them, then bring a pile of funny and genuinely interesting facts about it as talking points — the goal is to have way more fun with it than a typical review, and get you stoked to go put the album on yourself.",
  },
  {
    h: "4. Songs get DJ'd in the whole time",
    p: "There's no separate DJ segment saved for the end — funny look-alike songs that riff on the album's tracks, plus original comedy songs from the hosts' own record label, Permanent Records LLC, get dropped in throughout the entire episode. The talking never runs long before a song breaks it up. Great if you've got the attention span of a caffeinated toddler.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is Albums Anonymous?",
    a: "A weekly comedy podcast that's part album club, part unhinged radio show. Hosts Troy Runsten and Ryan Fox — self-described \"regular girl dads\" — dig into a classic album while DJ'ing funny look-alike and original songs inspired by it throughout the episode.",
  },
  {
    q: "How do you pick the album each week?",
    a: "It rotates. Troy picks one week, Ryan picks another, and guests get a turn too — which is how you end up with everything from untouchable classics to records someone has to defend with their whole chest.",
  },
  {
    q: "What does 'DJ' mean on the show?",
    a: "It's not one segment tacked onto the end — songs get DJ'd in throughout the whole episode. The hosts drop in funny look-alike songs that riff on the album's tracks, plus original comedy songs pulled from their own catalog, breaking up the conversation the entire time instead of saving it all for a closer. Great pacing if you've got a short attention span.",
  },
  {
    q: "Is this a track-by-track album review podcast?",
    a: "No, and that's the point. Instead of dissecting every song, they dig into why the album was picked and what it means to the person who picked it, then throw out fun and interesting facts as talking points. It's built to get you excited to go listen to the record yourself, not to replace listening to it.",
  },
  {
    q: "What is Permanent Records LLC?",
    a: "The hosts' own record label — home to all the original comedy songs written and produced for the show, independent of whatever album they're covering that week. You can stream or download the whole catalog for free.",
  },
  {
    q: "Do you use AI to make the songs?",
    a: "We don't use AI in our songs. Right? We're not answering that one — but if you want to know how you'd theoretically tell, there's a whole page on it.",
  },
  {
    q: "Where can I listen to Albums Anonymous?",
    a: "YouTube, Spotify, and Apple Podcasts — pick your platform below. You can also skip straight to the songs without the full episode.",
  },
];

export default function PodcastPage() {
  const episodes = getEpisodes();

  const podcastJsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: "Albums Anonymous",
    description,
    url: "https://albumsanonymous.com/podcast",
    sameAs: PODCAST_PLATFORMS.map((platform) => platform.href),
    productionCompany: {
      "@type": "Organization",
      name: "Permanent Records LLC",
      url: "https://www.permrecords.com/",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            An album club with a DJ problem
          </h1>
          <p className="text-base text-black/70 dark:text-white/70">
            Albums Anonymous is a weekly comedy podcast: someone picks an
            album, everyone actually listens to it, then the hosts get into
            why it was picked and drop fun facts you didn&apos;t know — with
            funny look-alike and original songs off their own label DJ&apos;d
            in throughout the whole episode, not saved for one segment at the
            end. Unhinged conversation, real records, and a genuine attempt to
            get you excited to go listen to the album yourself.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/listen"
              className="rounded-full bg-[#F760D6] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Skip to the songs
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Meet the hosts
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            How an episode works
          </h2>
          <div className="flex flex-col gap-3">
            {STEPS.map((s) => (
              <div
                key={s.h}
                className="rounded-2xl border border-black/10 bg-background p-4 dark:border-white/10"
              >
                <h3 className="text-sm font-semibold">{s.h}</h3>
                <p className="mt-1 text-sm text-black/70 dark:text-white/70">
                  {s.p}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">Who it&apos;s for</h2>
          <p className="text-sm text-black/80 dark:text-white/80">
            This isn&apos;t a polished think-piece about music, and it&apos;s
            not another podcast dissecting every track like it&apos;s a
            homework assignment. It&apos;s unhinged, unfiltered, and built for
            people who&apos;d rather laugh their way into a great album than
            read a review of one — the kind of show you put on doing yard work
            or dishes, end up quoting for a week, and are legitimately excited
            to go queue up the record by the time it&apos;s over. Songs get
            DJ&apos;d in throughout the episode instead of saved for the end,
            so if you&apos;ve got the attention span of a golden retriever,
            you&apos;re covered.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            The songs and Permanent Records LLC
          </h2>
          <p className="text-sm text-black/80 dark:text-white/80">
            The songs DJ&apos;d in throughout every episode pull from the
            hosts&apos; own record label, Permanent Records LLC — original
            comedy songs written under parody-artist personas, independent of
            whatever
            album is being covered that week. We don&apos;t use AI in our
            songs, right? (
            <Link href="/ai-songs" className="underline">
              here&apos;s how you&apos;d theoretically tell
            </Link>
            ). You can stream every song free, no login, and{" "}
            <Link href="/free-comedy-music" className="underline">
              download any of them
            </Link>{" "}
            with just an email — or remix two in the{" "}
            <Link href="/dj" className="underline">
              DJ booth
            </Link>
            .
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            Episodes with songs on this site
          </h2>
          <p className="text-sm text-black/70 dark:text-white/70">
            Every original song here was written for an episode. These are the
            episodes those songs came from — the rest of the catalogue is on
            your podcast app of choice.
          </p>
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {episodes.map((episode) => (
              <li key={episode.slug} className="py-2.5">
                <Link
                  href={`/podcast/${episode.slug}`}
                  className="text-sm font-medium hover:underline"
                >
                  Ep. {episode.number}: {episode.title}
                </Link>
                {episode.albumTitle && (
                  <span className="block text-xs text-black/50 dark:text-white/50">
                    {episode.albumArtist} — {episode.albumTitle}
                    {episode.guest ? ` · with ${episode.guest}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            Where to listen
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {PODCAST_PLATFORMS.map((platform) => (
              <EntryChoiceLink
                key={platform.name}
                href={platform.href}
                choice={platform.choice}
                external
                className="flex items-center gap-3 rounded-2xl border border-black/15 px-5 py-3 text-sm font-semibold transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                <PodcastPlatformIcon
                  slug={platform.slug}
                  className="h-5 w-5 shrink-0"
                />
                {platform.name}
              </EntryChoiceLink>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <div
                key={f.q}
                className="rounded-2xl border border-black/10 bg-background p-4 dark:border-white/10"
              >
                <h3 className="text-sm font-semibold">{f.q}</h3>
                <p className="mt-1 text-sm text-black/70 dark:text-white/70">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-start gap-3 border-t border-black/10 pt-6 dark:border-white/10">
          <h2 className="text-xl font-bold tracking-tight">Start here</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/listen"
              className="rounded-full bg-[#F760D6] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Browse the songs
            </Link>
            <Link
              href="/dj"
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Try the DJ booth
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
