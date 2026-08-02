import Link from "next/link";
import { PODCAST_PLATFORMS } from "@/lib/podcastPlatforms";

export const metadata = {
  title: "Watch the Podcast — Albums Anonymous",
};

export default function WatchPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Watch the Podcast
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Pick where you want to watch or listen.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          {PODCAST_PLATFORMS.map((platform) => (
            <a
              key={platform.name}
              href={platform.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-black/15 px-6 py-5 text-base font-semibold transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              {platform.name}
            </a>
          ))}
        </div>

        <Link
          href="/"
          className="text-xs font-medium text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
