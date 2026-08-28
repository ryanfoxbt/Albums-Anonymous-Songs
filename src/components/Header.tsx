import Link from "next/link";
import { EntryChoiceLink } from "@/components/landing/EntryChoiceLink";

export function Header({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-background/95 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
        >
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-7 w-7 rounded-md object-cover"
            />
          )}
          Albums Anonymous
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <EntryChoiceLink
            href="/listen"
            choice="listen"
            className="text-xs font-medium text-black/60 hover:text-black sm:text-sm dark:text-white/60 dark:hover:text-white"
          >
            Listen
          </EntryChoiceLink>

          <EntryChoiceLink
            href="/dj"
            choice="dj"
            className="rounded-full bg-[#F760D6] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 sm:text-sm"
          >
            DJ Booth
          </EntryChoiceLink>

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
