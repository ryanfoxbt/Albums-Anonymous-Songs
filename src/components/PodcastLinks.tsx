import { PodcastPlatformIcon } from "@/components/icons/PodcastPlatformIcon";
import { PODCAST_PLATFORMS } from "@/lib/podcastPlatforms";

export function PodcastLinks() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-black/50 dark:text-white/50">
        Watch the full podcast:
      </p>
      <div className="flex flex-wrap gap-2">
        {PODCAST_PLATFORMS.map((platform) => (
          <a
            key={platform.name}
            href={platform.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-xs font-medium hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <PodcastPlatformIcon
              slug={platform.slug}
              className="h-3.5 w-3.5 shrink-0"
            />
            {platform.name}
          </a>
        ))}
      </div>
    </div>
  );
}
