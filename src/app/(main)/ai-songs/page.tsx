import Link from "next/link";
import type { Metadata } from "next";
import { getSongs } from "@/lib/songs";

export const revalidate = 3600;

const title = "Funny AI Songs — We Don't Use AI In Our Songs. Right?";
const description =
  "We don't use AI in our songs. Probably. Here's how you'd tell if a funny AI song snuck past you — the ending, the backup vocals, the weird misplaced effects — purely as a public service, obviously.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "funny ai songs",
    "funny ai music",
    "ai comedy songs",
    "is this song ai generated",
    "how to tell if a song is ai generated",
    "ai generated music podcast",
    "suno songs",
    "ai parody songs",
    "ai music detector",
  ],
  alternates: { canonical: "/ai-songs" },
  openGraph: {
    title,
    description,
    url: "https://albumsanonymous.com/ai-songs",
  },
  twitter: { title, description },
};

const TELLS: { h: string; p: string }[] = [
  {
    h: "It can't land the plane",
    p: "A human songwriter makes a decision about how a song ends — a hard stop, a key change, a joke callback. AI has a much harder time with this, hypothetically. Endings tend to trail off into a generic fade, loop a tag one time too many, or just sort of... stop, like the model ran out of runway. If the last ten seconds of a song feel limp compared to everything before it, that's the single biggest tell — allegedly.",
  },
  {
    h: "The backup vocals get mushy",
    p: "The lead vocal on an AI track can sound shockingly good. The harmonies and backup vocals behind it are usually where it falls apart. The theory: these models are trained on an enormous pile of scraped audio, so the backing-vocal layer ends up sounding like an average of a thousand different session singers instead of one specific person. Listen close on headphones — if the lead is crisp but the \"oohs\" and harmonies behind it sound smeared, compressed, or oddly distant, that's a red flag. Not that we'd know.",
  },
  {
    h: "Weird effects show up where they don't belong",
    p: "A human producer places a riser, a vinyl crackle, or a reverb tail on purpose, because they know why it's there. AI models place effects because similar-sounding songs in their training data had something there \"often enough.\" The result is a whoosh or a swell that lands in a spot no producer would ever choose — not on a downbeat, not building to anything, just... there. It's subtle, but once you notice it you can't un-notice it.",
  },
  {
    h: "Consonants get chewed up",
    p: "AI vocals have gotten scary good at vowels. Hard consonants — S, T, P sounds — are still the weak point. They tend to come out slightly mushy or over-processed even when the rest of the vocal is clean. Same with breathing: AI vocals either skip breaths entirely or insert them on a suspiciously regular schedule. A real singer breathes like a person who's about to run out of air; a computer breathes like a computer that read about breathing.",
  },
  {
    h: "There's a digital \"haze\" up top",
    p: "Play it loud on real headphones. Fully AI tracks often carry a faint, glassy sheen in the high end — a kind of digital haze — that a live-recorded track doesn't have. It's the hardest tell to describe and the easiest to hear once you know what you're listening for. Again, purely academic interest on our part.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Does Albums Anonymous use AI to make its songs?",
    a: "No. Next question. Okay, fine — every song here is either 100% blood, sweat, and a hangover, or something we're not going to elaborate on any further, and we are contractually, morally, and comedically obligated to never say which is which for any specific song.",
  },
  {
    q: "So some of the songs could be AI?",
    a: "We didn't say that. We're saying that if a song did happen to use AI somewhere in the process, you probably wouldn't be able to tell — which is a completely different claim from the one you're trying to get us to make.",
  },
  {
    q: "What's Suno?",
    a: "A website, we assume. We've heard of it the same way you've heard of things you've definitely never personally used.",
  },
  {
    q: "Are the lyrics AI-written, at least?",
    a: "No — whatever else is or isn't true about how a song gets built, the jokes and lyrics always come from a human being suffering at a keyboard. That part is non-negotiable, and it's the part we'll actually take credit for.",
  },
  {
    q: "How can I tell if a song is AI-generated, in general, hypothetically?",
    a: "Listen for how it ends (AI struggles to land the plane), whether the backup vocals sound mushy compared to the lead, whether effects show up in places a human producer wouldn't put them, whether consonants sound over-processed, and whether there's a faint digital haze in the high end. None of these are foolproof on their own — heavy human mixing can hide most of them — but stacked together they're a strong signal. Purely a public service. No specific songs are being accused of anything.",
  },
  {
    q: "Is Albums Anonymous an AI music podcast?",
    a: "No — it's a comedy podcast where the hosts get you excited about a classic album, then DJ funny look-alike and original songs inspired by it. The show is not about AI. Whether AI is anywhere in the toolbox is between us and our sound engineer, who has also been advised not to comment.",
  },
];

export default async function AiSongsPage() {
  const songs = await getSongs({ sortBy: "popularity" });
  const songCount = songs.length;
  const featured = songs.slice(0, 8);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Funny AI Songs — How To Tell If A Song Is AI Generated",
    description,
    url: "https://albumsanonymous.com/ai-songs",
    author: { "@type": "Organization", name: "Albums Anonymous" },
    publisher: { "@type": "Organization", name: "Albums Anonymous" },
    mainEntityOfPage: "https://albumsanonymous.com/ai-songs",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            We don&apos;t use AI in our songs. Right?
          </h1>
          <p className="text-base text-black/70 dark:text-white/70">
            Great question. We&apos;re not going to answer it. What we will
            do is walk you through exactly how you&apos;d spot a funny AI
            song if one happened to be hiding among our {songCount} original
            comedy songs — purely as a public service, and for absolutely no
            other reason.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/listen"
              className="rounded-full bg-[#F760D6] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Go play detective — browse the songs
            </Link>
            <Link
              href="/dj"
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Try the DJ booth
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            How a song hypothetically gets made
          </h2>
          <p className="text-sm text-black/80 dark:text-white/80">
            One way a comedy song could theoretically come together: someone
            picks an album, a real person writes an actual joke at a keyboard,
            and then — this next part is the important part — it either gets
            performed and produced entirely by humans with guitars and a vocal
            booth, or it gets finished some other way we&apos;re not going to
            specify, and then produced and mixed until it&apos;s good enough
            to play on the podcast. Either path ends up sounding like a
            finished song. That&apos;s sort of the problem, if it were a
            problem, which we&apos;re not confirming it is.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              How to tell if a song is AI
            </h2>
            <p className="mt-1 text-sm text-black/70 dark:text-white/70">
              Purely general knowledge. No specific songs on this website are
              being accused of anything. None of these are foolproof alone —
              a good human mixing pass can hide most of them — but stacked
              together, they&apos;re a strong signal.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {TELLS.map((t) => (
              <div
                key={t.h}
                className="rounded-2xl border border-black/10 bg-background p-4 dark:border-white/10"
              >
                <h3 className="text-sm font-semibold">{t.h}</h3>
                <p className="mt-1 text-sm text-black/70 dark:text-white/70">
                  {t.p}
                </p>
              </div>
            ))}
          </div>
        </section>

        {featured.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold tracking-tight">
              Go listen for yourself
            </h2>
            <p className="text-sm text-black/70 dark:text-white/70">
              We&apos;re not saying any of these are AI. We&apos;re not saying
              none of them are, either. Put on headphones and listen for the
              ending.
            </p>
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
            Where these songs come from
          </h2>
          <p className="text-sm text-black/80 dark:text-white/80">
            Albums Anonymous is a weekly comedy{" "}
            <Link href="/podcast" className="underline">
              album club podcast
            </Link>
            . The hosts get you excited about a classic record, then DJ funny
            look-alike and original songs inspired by it, from their record
            label,{" "}
            <a
              href="https://www.permrecords.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Permanent Records LLC
            </a>
            . Every song streams free, and you can{" "}
            <Link href="/free-comedy-music" className="underline">
              download any of them
            </Link>{" "}
            with just an email.
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
              href="/podcast"
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Hear the podcast
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
