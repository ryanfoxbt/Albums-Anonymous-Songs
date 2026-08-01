const PLATFORMS = [
  { name: "YouTube", href: "https://www.youtube.com/@AlbumsAnonymous" },
  {
    name: "Spotify",
    href: "https://open.spotify.com/show/1NYP93z3rC1owDBIyh645E",
  },
  {
    name: "Apple Podcasts",
    href: "https://podcasts.apple.com/us/podcast/albums-anonymous/id1832826483",
  },
];

export function PodcastLinks() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-black/50 dark:text-white/50">
        Listen to the full podcast:
      </p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => (
          <a
            key={platform.name}
            href={platform.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          >
            {platform.name}
          </a>
        ))}
      </div>
    </div>
  );
}
