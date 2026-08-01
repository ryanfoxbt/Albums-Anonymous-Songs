import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-background/95 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Albums Anonymous
        </Link>

        <a
          href="https://merch.albumsanonymous.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
        >
          Merch
        </a>
      </div>
    </header>
  );
}
