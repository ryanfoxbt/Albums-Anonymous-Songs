const PLATFORMS = [
  { name: "Instagram", href: "https://www.instagram.com/permanentrecordsllc/" },
  { name: "Twitch", href: "https://www.twitch.tv/albumsanonymous" },
  { name: "TikTok", href: "https://www.tiktok.com/@permanentrecords" },
];

export function SocialLinks() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-black/50 dark:text-white/50">
        Follow along:
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
