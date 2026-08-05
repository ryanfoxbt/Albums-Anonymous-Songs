"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trackAnnouncementClick } from "@/lib/analyticsClient";

const DISMISSED_KEY = "aa_announcement_dismissed";

export function AnnouncementBanner({
  text,
  linkUrl,
  linkText,
  linkStyle = "link",
}: {
  text: string;
  linkUrl?: string | null;
  linkText?: string | null;
  linkStyle?: "link" | "button";
}) {
  const pathname = usePathname();
  const dismissKey = `${text}|${linkUrl ?? ""}|${linkText ?? ""}|${linkStyle}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISSED_KEY) === dismissKey) {
      setDismissed(true);
    }
  }, [dismissKey]);

  if (dismissed) return null;

  const handleLinkClick = () => {
    if (linkUrl) trackAnnouncementClick(linkUrl, text, pathname ?? "/");
  };

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-[#F760D6] px-8 py-2 text-center text-sm font-medium text-white">
      <p>
        {text}
        {linkUrl && linkStyle === "link" && (
          <>
            {" "}
            <a
              href={linkUrl}
              onClick={handleLinkClick}
              className="underline underline-offset-2 hover:text-white/90"
            >
              {linkText || linkUrl}
            </a>
          </>
        )}
      </p>

      {linkUrl && linkStyle === "button" && (
        <a
          href={linkUrl}
          onClick={handleLinkClick}
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#F760D6] shadow-sm hover:bg-white/90"
        >
          {linkText || "Learn more"}
        </a>
      )}

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
