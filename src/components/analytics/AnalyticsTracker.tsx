"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageview, trackPageviewDuration } from "@/lib/analyticsClient";

function TrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageViewIdRef = useRef<string | null>(null);
  const pageStartRef = useRef<number>(0);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    if (pageViewIdRef.current) {
      const elapsed = Date.now() - pageStartRef.current;
      trackPageviewDuration(pageViewIdRef.current, elapsed);
    }
    pageViewIdRef.current = null;
    pageStartRef.current = Date.now();

    trackPageview({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      utm: {
        utm_source: searchParams.get("utm_source") ?? undefined,
        utm_medium: searchParams.get("utm_medium") ?? undefined,
        utm_campaign: searchParams.get("utm_campaign") ?? undefined,
        utm_term: searchParams.get("utm_term") ?? undefined,
        utm_content: searchParams.get("utm_content") ?? undefined,
      },
    }).then((result) => {
      if (result) pageViewIdRef.current = result.pageViewId;
    });
    // searchParams is read via its string form so query-only changes on the
    // same path (e.g. a new utm-tagged link to "/") also count as a landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString()]);

  useEffect(() => {
    const flush = () => {
      if (pageViewIdRef.current) {
        const elapsed = Date.now() - pageStartRef.current;
        trackPageviewDuration(pageViewIdRef.current, elapsed);
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) flush();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
