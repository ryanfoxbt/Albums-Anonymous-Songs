"use client";

import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

export function Header() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-background/95 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Albums Anonymous
        </Link>

        {!isLoaded ? (
          <div className="h-8 w-8 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
        ) : isSignedIn ? (
          <UserButton />
        ) : (
          <SignInButton>
            <button
              type="button"
              className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Log in
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
