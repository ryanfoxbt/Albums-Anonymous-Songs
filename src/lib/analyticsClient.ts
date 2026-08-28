// Fire-and-forget analytics reporting for the browser. Every call here
// must never throw or block the UI — a tracking failure should be
// invisible to the visitor.

function beacon(url: string, data: unknown) {
  try {
    const blob = new Blob([JSON.stringify(data)], {
      type: "application/json",
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, { method: "POST", body: blob, keepalive: true }).catch(
        () => {},
      );
    }
  } catch {
    // Tracking must never break the app.
  }
}

async function post<T>(url: string, data: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export function trackPageview(params: {
  path: string;
  referrer: string;
  utm: Record<string, string | undefined>;
}): Promise<{ pageViewId: string } | null> {
  return post("/api/track/pageview", params);
}

export function trackPageviewDuration(pageViewId: string, durationMs: number) {
  beacon("/api/track/duration", { pageViewId, durationMs });
}

export function trackSongPlay(
  songId: string,
  path: string,
): Promise<{ eventId: string } | null> {
  return post("/api/track/song-play", { songId, path });
}

export function trackSongProgress(
  eventId: string,
  listenedSeconds: number,
  completed: boolean,
) {
  beacon("/api/track/song-progress", { eventId, listenedSeconds, completed });
}

export function trackPodcastClick(songId: string, url: string, path: string) {
  beacon("/api/track/podcast-click", { songId, url, path });
}

/**
 * Which route a session took off the homepage picker: one of the podcast
 * platforms, or "listen" for the site's own song player (the small homepage
 * link or the "Listen" nav item).
 */
export type EntryChoice = "spotify" | "youtube" | "apple" | "listen" | "dj";

export function trackEntryChoice(choice: EntryChoice) {
  beacon("/api/track/entry-choice", { choice });
}

export function trackAnnouncementClick(url: string, text: string, path: string) {
  beacon("/api/track/announcement-click", { url, text, path });
}

/** Fired once when a viewer presses play on a shared DJ mix (/mix/[slug]). */
export function trackMixPlay(slug: string) {
  beacon("/api/track/mix-play", { slug });
}
