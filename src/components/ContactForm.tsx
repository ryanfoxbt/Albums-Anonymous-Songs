"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const fieldClass =
  "w-full rounded-lg border border-black/15 bg-background px-3 py-2 text-sm placeholder:text-black/30 dark:border-white/20 dark:placeholder:text-white/30";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // Lazy initializer — captures when the form first rendered, for the
  // server-side "submitted too fast" bot check.
  const [mountedAt] = useState(() => Date.now());

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          company,
          elapsedMs: Date.now() - mountedAt,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[#F760D6]/30 bg-[#F760D6]/5 p-4 sm:p-5">
        <p className="text-sm font-medium">
          Got it — we&apos;ll reply from Permanent Records. Thanks.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="contact-name" className="text-xs font-medium text-black/60 dark:text-white/60">
          Name <span className="text-black/35 dark:text-white/35">(optional)</span>
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="contact-email" className="text-xs font-medium text-black/60 dark:text-white/60">
          Your email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="contact-message" className="text-xs font-medium text-black/60 dark:text-white/60">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Licensing a song, a press request, a broken link…"
          className={`${fieldClass} resize-y`}
        />
      </div>

      {/* honeypot */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="hidden"
      />

      <button
        type="submit"
        disabled={status === "loading"}
        className="self-start rounded-full bg-[#F760D6] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Send"}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}
