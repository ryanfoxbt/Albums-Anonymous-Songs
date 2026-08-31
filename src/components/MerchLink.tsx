"use client";

import { useEffect, useState } from "react";
import { trackMerchClick } from "@/lib/analyticsClient";

// The merch link is hidden by default and only shown to visitors the
// server considers "engaged" (see src/lib/merchEngagement.ts). The aa_vid
// cookie is httpOnly, so that decision — and the A/B copy — come back from
// /api/merch-variant rather than being computed in the browser.
export function MerchLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const [state, setState] = useState<{
    visible: boolean;
    variant: string;
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/merch-variant")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: {
          variant?: string;
          text?: string;
          visible?: boolean;
        } | null) => {
          if (cancelled || !data?.variant || !data.text) return;
          setState({
            visible: data.visible ?? false,
            variant: data.variant,
            text: data.text,
          });
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state || !state.visible) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Merch"
      className={className}
      onClick={() =>
        trackMerchClick(state.variant, state.text, window.location.pathname)
      }
    >
      {state.text}
    </a>
  );
}
