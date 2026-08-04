"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

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
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[#F760D6]/30 bg-[#F760D6]/5 p-4 sm:p-5">
        <p className="text-sm font-medium">
          You&apos;re in — we&apos;ll email you when new songs drop. 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 sm:p-5 dark:border-white/10 dark:bg-white/5">
      <p className="text-base font-semibold tracking-tight">
        Get new songs first
      </p>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        New parody songs weekly, straight to your inbox. No spam, unsubscribe
        anytime.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <label htmlFor="subscribe-email" className="sr-only">
          Email address
        </label>
        <input
          id="subscribe-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-full border border-black/15 bg-background px-4 py-2 text-sm placeholder:text-black/30 dark:border-white/20 dark:placeholder:text-white/30"
        />
        <input
          type="text"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-full bg-[#F760D6] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </button>

        {status === "error" && (
          <p className="w-full text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
