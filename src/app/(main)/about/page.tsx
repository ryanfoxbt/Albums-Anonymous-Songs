import Link from "next/link";
import type { Metadata } from "next";

const title = "About";
const description =
  "Albums Anonymous is a comedy music podcast — part album club, part unhinged radio show — where a classic record gets torn apart and a wildly unpredictable lineup of parody songs gets born.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { title, description },
};

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">What&apos;s this?</h1>

        <div className="flex flex-col gap-4 text-sm leading-relaxed text-black/80 dark:text-white/80">
          <p>
            Albums Anonymous is vinyl appreciation meets DJ&apos;d
            Defecation. I mean self deprecation.
          </p>
          <p>
            Hosted by regular girl dads Troy Runsten and Ryan Fox. They
            overshare everything — including how regular they are.
          </p>
          <p>
            Unlike your wife&apos;s book club, they always listen to the
            album before the show.
          </p>
          <p>
            We have guests like Steve, Mitchell, and Michael. We have not
            asked them how regular they are yet, but we would.
          </p>
          <p>Listen to it while you do yard work or dishes dude.</p>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/listen"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Listen to the songs
          </Link>
          <Link
            href="/"
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Watch the podcast
          </Link>
        </div>
      </main>
    </div>
  );
}
