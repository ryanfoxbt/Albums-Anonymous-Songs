"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trackAnnouncementClick } from "@/lib/analyticsClient";

const DISMISSED_KEY = "aa_announcement_dismissed";

function extractPath(url: string): string | null {
  if (url.startsWith("/")) return url.split(/[?#]/)[0];
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

export function AnnouncementBanner({
  text,
  linkUrl,
  linkText,
  linkStyle = "link",
  hideOnHome = false,
}: {
  text: string;
  linkUrl?: string | null;
  linkText?: string | null;
  linkStyle?: "link" | "button";
  hideOnHome?: boolean;
}) {
  const pathname = usePathname();
  const dismissKey = `${text}|${linkUrl ?? ""}|${linkText ?? ""}|${linkStyle}`;

  // Default to visible on the server and on the very first client render
  // (before we can trust the current route) — mirrors the localStorage
  // dismiss check below, which has the same brief-flash trade-off. Never
  // decide visibility from pathname during the initial render: that would
  // get baked into statically prerendered HTML incorrectly, the same bug
  // that previously kept the footer showing on the home page.
  const [dismissed, setDismissed] = useState(false);
  const [hiddenForRoute, setHiddenForRoute] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISSED_KEY) === dismissKey) {
      setDismissed(true);
    }
  }, [dismissKey]);

  useEffect(() => {
    const isHome = pathname === "/";
    const linkPath = linkUrl ? extractPath(linkUrl) : null;
    const onLinkPage = linkPath != null && pathname === linkPath;
    setHiddenForRoute((isHome && hideOnHome) || onLinkPage);
  }, [pathname, linkUrl, hideOnHome]);

  if (dismissed || hiddenForRoute) return null;

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
