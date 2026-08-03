import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-background/95 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-tight"
        >
          Albums Anonymous
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/listen"
            className="text-xs font-medium text-black/60 hover:text-black sm:text-sm dark:text-white/60 dark:hover:text-white"
          >
            Listen
          </Link>

          <Link
            href="/press"
            className="text-xs font-medium text-black/60 hover:text-black sm:text-sm dark:text-white/60 dark:hover:text-white"
          >
            Make a Playlist
          </Link>

          <Link
            href="/about"
            className="text-xs font-medium text-black/60 hover:text-black sm:text-sm dark:text-white/60 dark:hover:text-white"
          >
            About
          </Link>

          <a
            href="https://merch.albumsanonymous.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-black/60 hover:text-black sm:text-sm dark:text-white/60 dark:hover:text-white"
          >
            Merch
          </a>
        </div>
      </div>
    </header>
  );
}
