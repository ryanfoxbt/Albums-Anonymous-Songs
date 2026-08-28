import Link from "next/link";
import type { Metadata } from "next";

const title = "Learn to DJ Online Free — Browser DJ Booth, No Download";
const description =
  "Learn to DJ in your browser for free — no software, no download, no login to play. Practice beatmatching, crossfading, EQ, filters and scratching on real decks using Albums Anonymous comedy songs, then record and share your mix.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "learn to dj",
    "learn to dj online",
    "free online dj",
    "browser dj",
    "dj in your browser",
    "free dj software no download",
    "practice djing online",
    "how to dj for beginners",
    "online dj mixer",
    "learn to dj with comedy songs",
  ],
  alternates: { canonical: "/dj/learn" },
  openGraph: { title, description, url: "https://albumsanonymous.com/dj/learn" },
  twitter: { title, description },
};

const STEPS: { name: string; text: string }[] = [
  {
    name: "Load a song onto each deck",
    text: "Pick a track from the list and send it to Deck A, then send a second track to Deck B. Each deck is an independent player you can cue, pitch and mangle on its own.",
  },
  {
    name: "Start Deck A and find the beat",
    text: "Press play on Deck A. Tap the tempo button in time with the kick to set its BPM, or trust the detected value. Knowing both decks' BPM is what lets you beatmatch.",
  },
  {
    name: "Beatmatch Deck B",
    text: "Cue Deck B, hit Sync (or nudge the Tempo slider) until its BPM matches Deck A, so the two tracks run in step instead of drifting apart.",
  },
  {
    name: "Blend with the crossfader",
    text: "With the crossfader on the A side you hear Deck A. Slide it toward B to fade the second track in. Use the EQ knobs to pull the bass out of one track while you bring the other up so the low end never doubles.",
  },
  {
    name: "Add effects and scratches",
    text: "Sweep the Filter for a build, drop in Echo or Reverb on a phrase ending, or trigger a Baby / Scribble / Transformer scratch for a transition accent.",
  },
  {
    name: "Record and share your set",
    text: "Hit Record, mix for up to three minutes, then Stop. You get a link your friends can open to hear the mix and watch every fader, knob and scratch move exactly how you played it.",
  },
];

const TERMS: { term: string; def: string }[] = [
  {
    term: "Deck",
    def: "One of the two independent players. A DJ mix is the act of moving between Deck A and Deck B without the music stopping.",
  },
  {
    term: "Crossfader",
    def: "The horizontal slider that sets how much of Deck A versus Deck B you hear. All the way left is pure A, all the way right is pure B, the middle is both.",
  },
  {
    term: "Beatmatching",
    def: "Adjusting one deck's tempo so its beats line up with the other deck's, so the two tracks can play together without clashing.",
  },
  {
    term: "BPM",
    def: "Beats per minute — a track's tempo. Two tracks at the same BPM are far easier to blend. Tap the tempo button in time with the beat to measure it.",
  },
  {
    term: "Cue",
    def: "A saved position in a track. Set a cue on the first downbeat so you can jump the deck straight back to it when it's time to bring that track in.",
  },
  {
    term: "EQ (3-band)",
    def: "Separate Low, Mid and High controls. Cutting the lows on the incoming track while it's still under the outgoing one keeps the bass from turning to mud during a blend.",
  },
  {
    term: "Filter",
    def: "A single sweepable control: turn it down for a muffled low-pass, up for a thin high-pass. A slow filter sweep is the simplest way to build tension into a transition.",
  },
  {
    term: "Echo / Reverb / Flanger",
    def: "Send effects. Echo repeats the sound, reverb adds space, flanger adds a jet-plane sweep. A quick hit of echo on the last beat before a cut hides the seam.",
  },
  {
    term: "Scratch",
    def: "Moving the record back and forth under the needle for a rhythmic, vocal-like sound. The booth has three canned patterns — baby, scribble and transformer.",
  },
  {
    term: "Auto DJ",
    def: "A hands-off mode that keeps both decks stocked and crossfades into a fresh track whenever the current one ends — useful for hearing how blends should feel.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is it really free to learn to DJ here?",
    a: "Yes. The DJ booth is free to use with no account and no download. You only give an email if you want to save and share a mix.",
  },
  {
    q: "Do I need any experience?",
    a: "No. The five steps above are enough to make your first blend. Start with two songs at similar BPMs, practice the crossfade, then add EQ and effects once the blend feels comfortable.",
  },
  {
    q: "What do I need to run it?",
    a: "A modern browser on a desktop or laptop, and headphones or speakers. It uses the Web Audio API, which is built into Chrome, Firefox, Safari and Edge — nothing to install.",
  },
  {
    q: "Can I use my own music?",
    a: "Not yet — the booth plays the Albums Anonymous catalogue of comedy songs. They work well for learning because they're short, structured and memorable, so it's obvious when a blend is on or off.",
  },
  {
    q: "How do I share a mix I made?",
    a: "Press Record in the booth, play your set (up to three minutes), then Stop. After a one-time email, you get a link. Opening it replays your mix in the browser with every control moving as you left it.",
  },
  {
    q: "Does it work on a phone?",
    a: "It runs best on a larger screen where you can reach both decks and the crossfader at once. On a phone you can still play a shared mix and hear it back.",
  },
];

export default function LearnToDjPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to DJ your first mix in a browser",
    description,
    totalTime: "PT10M",
    tool: [{ "@type": "HowToTool", name: "Albums Anonymous DJ Booth" }],
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `https://albumsanonymous.com/dj/learn#step-${i + 1}`,
    })),
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

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Albums Anonymous DJ Booth",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (web browser)",
    url: "https://albumsanonymous.com/dj",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "A free in-browser DJ booth with two decks, 3-band EQ, filter, echo, reverb, flanger and scratch, built on the Albums Anonymous comedy-song catalogue.",
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Learn to DJ in your browser — free, no download
          </h1>
          <p className="text-base text-black/70 dark:text-white/70">
            The Albums Anonymous <strong>DJ Booth</strong>{" "}
            is a real two-deck mixer that runs in a browser tab. No software, no
            account, and no
            login to play. You practice the actual moves — beatmatching,
            crossfading, EQ, filter sweeps, effects and scratching — on a
            catalogue of short, structured comedy songs, which makes it obvious
            when a blend lands and when it doesn&apos;t.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/dj"
              className="rounded-full bg-[#F760D6] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              🎧 Open the DJ Booth
            </Link>
            <Link
              href="/listen"
              className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Hear the songs first
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            What you can do in the booth
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-black/80 dark:text-white/80">
            <li>Run two independent decks and blend between them live</li>
            <li>Beatmatch with tap-tempo, detected BPM and a Sync button</li>
            <li>Shape each track with a 3-band EQ and a sweepable filter</li>
            <li>Drop in echo, reverb and flanger as send effects</li>
            <li>Trigger baby, scribble and transformer scratches</li>
            <li>Let Auto DJ crossfade tracks for you while you watch and learn</li>
            <li>
              Record up to three minutes and share a link that replays your mix
              with every knob moving
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">
            How to DJ your first mix, step by step
          </h2>
          <ol className="flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <li
                key={step.name}
                id={`step-${i + 1}`}
                className="flex gap-3 rounded-2xl border border-black/10 bg-background p-4 dark:border-white/10"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">{step.name}</h3>
                  <p className="text-sm text-black/70 dark:text-white/70">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">DJ terms, explained</h2>
          <dl className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {TERMS.map((t) => (
              <div key={t.term} className="flex flex-col gap-1 py-3">
                <dt className="text-sm font-semibold">{t.term}</dt>
                <dd className="text-sm text-black/70 dark:text-white/70">
                  {t.def}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            Why practice with comedy songs?
          </h2>
          <p className="text-sm text-black/80 dark:text-white/80">
            Learning to DJ is about hearing structure — intros, drops, phrase
            endings — and reacting in time. The Albums Anonymous catalogue is
            built from tight, punchy parody songs with clear sections, so a blend
            that&apos;s a beat off is instantly obvious, and a clean transition is
            genuinely satisfying (and funny). They&apos;re also the songs from the{" "}
            <Link href="/listen" className="underline">
              Albums Anonymous
            </Link>{" "}
            comedy music podcast, so every track links back to the episode it was
            written for.
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
          <h2 className="text-xl font-bold tracking-tight">Ready to try it?</h2>
          <p className="text-sm text-black/70 dark:text-white/70">
            The booth opens in a tab. Load two songs, press play, and start
            moving the crossfader.
          </p>
          <Link
            href="/dj"
            className="rounded-full bg-[#F760D6] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            🎧 Open the DJ Booth
          </Link>
        </section>
      </main>
    </div>
  );
}
