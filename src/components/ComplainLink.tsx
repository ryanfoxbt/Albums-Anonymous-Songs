"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MAX = 1000;

type Status = "idle" | "loading" | "done" | "error";

export function ComplainLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const openedAtRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openDialog = () => {
    openedAtRef.current = Date.now();
    setMessage("");
    setCompany("");
    setStatus("idle");
    setError("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const focusId = window.setTimeout(() => textareaRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusId);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) {
      setError("Add a few words about what's wrong.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/complain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.slice(0, MAX),
          company,
          elapsedMs: Date.now() - openedAtRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again shortly.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Something went wrong. Try again shortly.");
      setStatus("error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Complain about anything"
        title="Complain about anything"
        className={
          className ??
          "align-baseline text-sm opacity-40 transition-opacity hover:opacity-100"
        }
      >
        😤
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="complain-title"
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-black/10 bg-background p-5 shadow-xl dark:border-white/10"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
              >
                ✕
              </button>

              <p
                id="complain-title"
                className="pr-6 text-base font-semibold tracking-tight"
              >
                Complain about anything
              </p>

              {status === "done" ? (
                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-sm">
                    Got it. Thanks for the complaint — genuinely.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="self-start rounded-full bg-[#F760D6] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="mt-4 flex flex-col gap-2"
                >
                  <label htmlFor="complain-message" className="sr-only">
                    Your complaint
                  </label>
                  <textarea
                    id="complain-message"
                    ref={textareaRef}
                    required
                    rows={5}
                    maxLength={MAX}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full resize-y rounded-xl border border-black/15 bg-background px-3 py-2 text-sm dark:border-white/20"
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
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-black/40 dark:text-white/40">
                      {message.length}/{MAX}
                    </span>
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="rounded-full bg-[#F760D6] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {status === "loading" ? "Sending…" : "Send complaint"}
                    </button>
                  </div>
                  {status === "error" && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
