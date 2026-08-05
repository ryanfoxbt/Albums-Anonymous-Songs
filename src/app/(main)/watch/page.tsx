import Link from "next/link";
import { PODCAST_PLATFORMS } from "@/lib/podcastPlatforms";

const title = "Watch the Podcast";
const description =
  "Watch or listen to Albums Anonymous, the comedy music podcast, on YouTube, Spotify, or Apple Podcasts — plus the funny original songs it's spawned.";

export const metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { title, description },
};

const podcastJsonLd = {
  "@context": "https://schema.org",
  "@type": "PodcastSeries",
  name: "Albums Anonymous",
  description:
    "A comedy music podcast where classic albums get the parody-song treatment.",
  url: "https://albumsanonymous.com/watch",
  sameAs: PODCAST_PLATFORMS.map((platform) => platform.href),
};

export default function WatchPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastJsonLd) }}
      />
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
