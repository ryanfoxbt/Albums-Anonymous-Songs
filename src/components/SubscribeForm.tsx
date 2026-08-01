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
      <p className="text-xs text-black/50 dark:text-white/50">
        You&apos;re in — we&apos;ll email you when new songs drop.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2"
    >
      <label
        htmlFor="subscribe-email"
        className="text-xs text-black/50 dark:text-white/50"
      >
        New songs weekly, straight to your inbox:
      </label>
      <input
        id="subscribe-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="rounded-full border border-black/10 bg-transparent px-3 py-1 text-xs text-black/70 placeholder:text-black/30 dark:border-white/10 dark:text-white/70 dark:placeholder:text-white/30"
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
        className="text-xs font-medium text-black/50 underline hover:text-black disabled:opacity-60 dark:text-white/50 dark:hover:text-white"
      >
        {status === "loading" ? "Subscribing..." : "Subscribe"}
      </button>

      {status === "error" && (
        <p className="w-full text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
