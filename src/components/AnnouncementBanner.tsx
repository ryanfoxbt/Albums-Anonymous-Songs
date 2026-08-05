"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "aa_announcement_dismissed";

export function AnnouncementBanner({
  text,
  linkUrl,
  linkText,
}: {
  text: string;
  linkUrl?: string | null;
  linkText?: string | null;
}) {
  const dismissKey = `${text}|${linkUrl ?? ""}|${linkText ?? ""}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISSED_KEY) === dismissKey) {
      setDismissed(true);
    }
  }, [dismissKey]);

  if (dismissed) return null;

  return (
    <div className="relative flex items-center justify-center bg-[#F760D6] px-8 py-2 text-center text-sm font-medium text-white">
      <p>
        {text}
        {linkUrl && (
          <>
            {" "}
            <a
              href={linkUrl}
              className="underline underline-offset-2 hover:text-white/90"
            >
              {linkText || linkUrl}
            </a>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(DISMISSED_KEY, dismissKey);
          setDismissed(true);
        }}
        aria-label="Dismiss announcement"
        className="absolute right-2 rounded-full p-1.5 leading-none text-white/80 hover:bg-white/10 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
