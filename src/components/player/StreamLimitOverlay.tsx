"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { usePlayer } from "./PlayerProvider";

export function StreamLimitOverlay() {
  const { streamLimitReached, dismissStreamLimit } = usePlayer();

  if (!streamLimitReached) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6">
      <div className="relative w-full max-w-2xl rounded-2xl border border-black/10 bg-background/95 p-4 shadow-lg backdrop-blur dark:border-white/10">
        <button
          type="button"
          onClick={dismissStreamLimit}
          aria-label="Dismiss"
          className="absolute right-3 top-3 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
        >
          ✕
        </button>

        <p className="pr-6 text-sm">
          You&apos;ve used your 3 free streams for today! Log in or sign up
          for a free account to unlock unlimited high-quality streaming.
        </p>

        <div className="mt-3 flex gap-2">
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90"
            >
              Sign up free
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Log in
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}
