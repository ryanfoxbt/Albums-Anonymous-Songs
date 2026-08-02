import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Albums <span className="text-[#F760D6]">Anonymous</span>
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Funny original songs meets vinyl appreciation.
          </p>
          <p className="text-xs text-black/40 dark:text-white/40">
            Troy Runsten &amp; Ryan Fox
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Link
            href="/listen"
            className="rounded-2xl bg-black px-6 py-5 text-base font-semibold text-white shadow-sm transition hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            Listen to the Songs
          </Link>
          <Link
            href="/watch"
            className="rounded-2xl border border-black/15 px-6 py-5 text-base font-semibold transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Watch the Podcast
          </Link>
        </div>
      </div>
    </div>
  );
}
