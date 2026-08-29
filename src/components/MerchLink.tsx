"use client";

import { useEffect, useState } from "react";
import { trackMerchClick } from "@/lib/analyticsClient";

// Matches the SiteSetting.merchVariantAText default in prisma/schema.prisma —
// shown until the client-side variant fetch resolves (the aa_vid cookie is
// httpOnly, so the variant can't be read directly in the browser).
const DEFAULT_TEXT = "Your wife will hate it";

export function MerchLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const [variant, setVariant] = useState("a");
  const [text, setText] = useState(DEFAULT_TEXT);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/merch-variant")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { variant?: string; text?: string } | null) => {
        if (cancelled || !data?.variant || !data.text) return;
        setVariant(data.variant);
        setText(data.text);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Merch"
      className={className}
      onClick={() =>
        trackMerchClick(variant, text, window.location.pathname)
      }
    >
      {text}
    </a>
  );
}
