import Link from "next/link";
import type { Metadata } from "next";
import { getSongs } from "@/lib/songs";

export const revalidate = 3600;

const title = "Free Comedy Music — Stream & Download Funny Original Songs";
const description =
  "Free comedy music: stream every funny original song with no login, and download the MP3 with just an email. Original parody songs across pop, rock, rap and more from the Albums Anonymous comedy music podcast.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "free comedy music",
    "funny songs",
    "comedy songs free download",
    "free funny music mp3",
    "parody songs",
    "funny original songs",
    "comedy music podcast",
    "funny songs to download",
    "free parody music",
  ],
  alternates: { canonical: "/free-comedy-music" },
  openGraph: {
    title,
    description,
    url: "https://albumsanonymous.com/free-comedy-music",
  },
  twitter: { title, description },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is the comedy music really free?",
    a: "Yes. Every song streams in full for free with no account and no login. If you want the MP3 to keep, you give an email once and the download unlocks — that's the only ask, and streaming stays free either way.",
  },
  {
    q: "Do I need an account to listen?",
    a: "No. Open any song and press play. There is no signup wall on streaming — you only enter an email when you want to download a file or share a mix you made in the DJ booth.",
  },
  {
    q: "How do I download a song?",
    a: "Every song page and every row in the song list has a Download MP3 button. The first time, it asks for an email; after that, downloads are one click.",
  },
  {
    q: "Can I use these songs in my videos or DJ sets?",
    a: "You can mix and share them inside the on-site DJ booth freely. For using a track in your own published video, reach out through the site — these are original recordings, not public domain.",
  },
  {
    q: "What kind of comedy songs are these?",
    a: "Original comedy songs written under parody-artist personas — send-ups of pop, rock, indie, rap and singer-songwriter styles, with hyper-specific, everyday-life lyrics. They're short, structured and built around a joke.",
  },
  {
    q: "Who makes the music?",
    a: "Albums Anonymous, a weekly comedy music podcast that treats a classic album like a book club and then writes an original parody song inspired by it. The songs here are those tracks, without the podcast's laugh track.",
  },
];

export default async function FreeComedyMusicPage() {
  const songs = await getSongs({ sortBy: "popularity" });
  const songCount = songs.length;
  const genres = Array.from(new Set(songs.map((s) => s.genre.name))).sort();
  const artists = Array.from(new Set(songs.map((s) => s.artist.name))).slice(
    0,
    12,
  );
  const featured = songs.slice(0, 8);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Comedy Music",
    description,
    url: "https://albumsanonymous.com/free-comedy-music",
    isPartOf: {
      "@type": "WebSite",
      name: "Albums Anonymous",
      url: "https://albumsanonymous.com",
    },
    about: {
      "@type": "MusicGroup",
      name: "Albums Anonymous",
      genre: genres,
      url: "https://albumsanonymous.com",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Free comedy music — stream and download funny original songs
          </h1>
          <p className="text-base text-black/70 dark:text-white/70">
            {songCount} original comedy songs you can play in full for free, with
            no account. Want to keep one? Download the MP3 with just an email —
            streaming stays free no matter what. Every track is an original
            parody song from the{" "}
            <Link href="/" className="underline">
              Albums Anonymous
            </Link>{" "}
            comedy music podcast, minus the laugh track.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/listen"
              className="rounded-full bg-[#F760D6] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Browse all {songCount} songs
            </Link>
            <Link
              href="/"
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Listen to the podcast
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            How to get the songs
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-black/80 dark:text-white/80">
            <li>
              <strong>Stream free, no login.</strong> Open{" "}
              <Link href="/listen" className="underline">
                the song list
              </Link>{" "}
              or any song page and press play. Full songs, no laugh track, no
              signup.
            </li>
            <li>
              <strong>Download free with an email.</strong> Hit Download MP3 on a
              song, enter your email once, and the file is yours — every download
              after that is one click.
            </li>
            <li>
              <strong>Remix them.</strong> The free in-browser{" "}
              <Link href="/dj" className="underline">
                DJ booth
              </Link>{" "}
              lets you mix any two songs and share the result.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            What kind of comedy songs
          </h2>
          <p className="text-sm text-black/80 dark:text-white/80">
            Original comedy songs written under parody-artist personas, spanning{" "}
            {genres.slice(0, -1).join(", ")}
            {genres.length > 1 ? ` and ${genres[genres.length - 1]}` : genres[0]}.
            Short, tightly structured, and built around a specific joke — awkward
            social situations, oddly specific personality types, and everyday-life
            absurdity.
          </p>
          {artists.length > 0 && (
            <p className="text-sm text-black/60 dark:text-white/60">
              Parody artists include {artists.join(", ")}.
            </p>
          )}
        </section>

        {featured.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold tracking-tight">
              Popular right now
            </h2>
            <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
              {featured.map((song) => (
                <li key={song.slug} className="py-2.5">
                  <Link
                    href={`/song/${song.slug}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {song.title}
                  </Link>{" "}
                  <span className="text-sm text-black/50 dark:text-white/50">
                    — {song.artist.name} · {song.genre.name}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/listen"
              className="text-sm font-medium underline hover:text-foreground"
            >
              See all {songCount} songs →
            </Link>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            Where the songs come from
          </h2>
          <p className="text-sm text-black/80 dark:text-white/80">
            Albums Anonymous is a weekly comedy music podcast: the hosts pick
            apart a classic album like a book club, then write and record an
            original parody song inspired by it. This page is those songs on
            their own. To hear the full episodes and the story behind each track,{" "}
            <Link href="/" className="underline">
              choose your podcast app on the home page
            </Link>{" "}
            — it&apos;s on Spotify, Apple Podcasts and YouTube.
          </p>
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
          <h2 className="text-xl font-bold tracking-tight">
            Start listening
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/listen"
              className="rounded-full bg-[#F760D6] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Open the song list
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
