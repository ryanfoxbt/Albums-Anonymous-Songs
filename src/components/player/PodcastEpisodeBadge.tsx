export function PodcastEpisodeBadge({
  podcastEpisodeTitle,
  podcastEpisodeUrl,
}: {
  podcastEpisodeTitle?: string | null;
  podcastEpisodeUrl?: string | null;
}) {
  if (!podcastEpisodeTitle || !podcastEpisodeUrl) return null;

  return (
    <a
      href={podcastEpisodeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-[52px] inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-violet-300 bg-violet-600 px-3 py-1 text-xs font-semibold tracking-tight text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-500 dark:border-violet-400/50"
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        aria-hidden
      >
        <rect x="6" y="1.5" width="4" height="7" rx="2" />
        <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0" />
        <path d="M8 12v2.5" />
        <path d="M5.5 14.5h5" />
      </svg>
      <span className="truncate">
        First heard on: <span className="font-bold">{podcastEpisodeTitle}</span>
      </span>
    </a>
  );
}
