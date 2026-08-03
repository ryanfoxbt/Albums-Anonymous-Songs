import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Albums Anonymous is a comedy music podcast — part album club, part unhinged radio show — where a classic record gets torn apart and a wildly unpredictable lineup of parody songs gets born.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">What&apos;s this?</h1>

        <div className="flex flex-col gap-4 text-sm leading-relaxed text-black/80 dark:text-white/80">
          <p>
            Albums Anonymous is part album club, part unhinged comedy radio
            show, and entirely what happens when a deuce of dads sync their
            love for music, their midlife crises, and reaction-worthy
            comedy songs.
          </p>
          <p>
            Every week, we break down one of our all-time favorite records
            from front to back. But we don&apos;t just sit around stroking
            our balls over vinyl pressings—we spin the tracks, dive into
            the chaos behind the making of the record, and roll out a
            wildly unpredictable lineup of songs that may or may not have
            been inspired by the album of the week.
          </p>
          <p>Is the connection sometimes a stretch? Absolutely.</p>
          <p>Is the music great? Always.</p>
          <p>Is this your typical, dry music analysis podcast? Not even close.</p>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/listen"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Listen to the songs
          </Link>
          <Link
            href="/watch"
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Watch the podcast
          </Link>
        </div>
      </main>
    </div>
  );
}
