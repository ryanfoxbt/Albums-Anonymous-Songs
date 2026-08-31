"use client";

import { useEffect, useRef } from "react";

// The address is assembled from parts and written to the DOM after mount,
// so it never appears in the server-rendered HTML or the RSC payload that
// address-harvesting bots scrape. Naive scrapers (the overwhelming
// majority) don't run JS and won't see it.
const USER = ["c", "o", "n", "t", "a", "c", "t"].join("");
const DOMAIN = ["perm", "records", ".com"].join("");

export function ObfuscatedEmail({ className }: { className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const addr = `${USER}@${DOMAIN}`;
    el.setAttribute("href", `mailto:${addr}`);
    el.textContent = addr;
  }, []);

  return (
    <a ref={ref} className={className}>
      our inbox
    </a>
  );
}
