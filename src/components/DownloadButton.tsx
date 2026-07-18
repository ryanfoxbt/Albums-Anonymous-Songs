"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export function DownloadButton({ songId }: { songId: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <div className="h-9 w-28 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
    );
  }

  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
        className="inline-flex items-center justify-center rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
      >
        Log in to download
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <a
        href={`/api/download/${songId}`}
        className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
      >
        Download
      </a>
      <p className="text-xs text-black/60 dark:text-white/60">
        Please credit &ldquo;Albums Anonymous&rdquo; if you use this track in
        your videos.
      </p>
    </div>
  );
}
