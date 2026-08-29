"use client";

import { useEffect, useRef, useState } from "react";
import { markEmailUnlocked } from "@/lib/emailGate";

type Status = "idle" | "loading" | "error";

const COPY: Record<
  "download" | "mix" | "unlisted",
  { title: string; blurb: string; cta: string }
> = {
  download: {
    title: "Drop your email to download",
    blurb:
      "Streaming stays free forever — no login. Downloads just need an email so we can tell you when new songs land.",
    cta: "Unlock the download",
  },
  mix: {
    title: "Drop your email to share your mix",
    blurb:
      "We'll give you a link your friends can open to hear (and watch) your mix. One email, and you're set.",
    cta: "Get my share link",
  },
  unlisted: {
    title: "Drop your email to see unlisted tracks",
    blurb:
      "Unlisted songs are ones we haven't put on the main list yet — cuts, early drafts, one-offs. One email unlocks those here plus unlimited downloads and a heads-up the moment we drop something new.",
    cta: "Unlock unlisted tracks",
  },
};

export function EmailGateDialog({
  open,
  reason,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  reason: "download" | "mix" | "unlisted";
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect --
     clearing transient form state each time the dialog is (re)opened */
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setError("");
      // Focus the field once the dialog is on screen.
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = COPY[reason];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      markEmailUnlocked();
      onUnlocked();
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-gate-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-black/10 bg-background p-5 shadow-xl dark:border-white/10"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
        >
          ✕
        </button>

        <p
          id="email-gate-title"
          className="pr-6 text-base font-semibold tracking-tight"
        >
          {copy.title}
        </p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {copy.blurb}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
          <label htmlFor="email-gate-input" className="sr-only">
            Email address
          </label>
          <input
            id="email-gate-input"
            ref={inputRef}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-full border border-black/15 bg-background px-4 py-2 text-sm placeholder:text-black/30 dark:border-white/20 dark:placeholder:text-white/30"
          />
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full bg-[#F760D6] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {status === "loading" ? "One sec…" : copy.cta}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <p className="text-center text-[11px] text-black/40 dark:text-white/40">
            No spam. One email when new songs drop.
          </p>
        </form>
      </div>
    </div>
  );
}
