import type { SVGProps } from "react";

// Full-color brand logos. Each mark carries its own background shape (the
// YouTube rounded rectangle, the Spotify circle, the Apple Podcasts squircle)
// so it reads on both light and dark surfaces without any `currentColor`.

type IconProps = SVGProps<SVGSVGElement>;

function YouTubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814Z"
      />
      <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

function SpotifyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#1ED760"
        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0Z"
      />
      <path
        fill="#000000"
        d="M17.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02Zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2Zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3Z"
      />
    </svg>
  );
}

function ApplePodcastsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <defs>
        <linearGradient
          id="apple-podcasts-gradient"
          x1="12"
          y1="0"
          x2="12"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#822CBE" />
          <stop offset="1" stopColor="#D772FB" />
        </linearGradient>
      </defs>
      <rect
        width="24"
        height="24"
        rx="5.4"
        fill="url(#apple-podcasts-gradient)"
      />
      <path
        fill="#FFFFFF"
        d="M12 3.62c-4.07 0-7.38 3.3-7.38 7.38 0 2.65 1.4 4.98 3.5 6.28.12-.55.3-1.05.5-1.42-1.6-1.05-2.62-2.85-2.62-4.86 0-3.3 2.7-6 6-6s6 2.7 6 6c0 2.01-1.02 3.81-2.62 4.86.2.37.38.87.5 1.42 2.1-1.3 3.5-3.63 3.5-6.28 0-4.08-3.31-7.38-7.38-7.38Z"
      />
      <circle cx="12" cy="9.9" r="2" fill="#FFFFFF" />
      <path
        fill="#FFFFFF"
        d="M12 11.8c-1.75 0-3.1 1.2-3.1 2.6 0 .5.15 1.35.9 3.4.5 1.35.9 2.28 1.13 2.63.3.46 1.84.46 2.14 0 .23-.35.63-1.28 1.13-2.63.75-2.05.9-2.9.9-3.4 0-1.4-1.35-2.6-3.1-2.6Z"
      />
    </svg>
  );
}

const ICONS: Record<string, (props: IconProps) => React.ReactNode> = {
  youtube: YouTubeIcon,
  spotify: SpotifyIcon,
  "apple-podcasts": ApplePodcastsIcon,
};

export function PodcastPlatformIcon({
  slug,
  ...props
}: IconProps & { slug: string }) {
  const Icon = ICONS[slug];
  if (!Icon) return null;
  return <Icon {...props} />;
}
