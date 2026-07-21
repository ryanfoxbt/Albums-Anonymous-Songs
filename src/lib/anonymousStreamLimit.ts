const COUNT_KEY = "daily_stream_count";
const FIRST_STREAM_KEY = "daily_stream_started_at";
const WINDOW_MS = 24 * 60 * 60 * 1000;

export const FREE_STREAM_LIMIT = 3;

function readState(): { count: number; firstStreamAt: number | null } {
  if (typeof window === "undefined") {
    return { count: 0, firstStreamAt: null };
  }

  const rawCount = window.localStorage.getItem(COUNT_KEY);
  const rawFirstStreamAt = window.localStorage.getItem(FIRST_STREAM_KEY);
  const firstStreamAt = rawFirstStreamAt ? Number(rawFirstStreamAt) : null;

  if (firstStreamAt && Date.now() - firstStreamAt > WINDOW_MS) {
    window.localStorage.removeItem(COUNT_KEY);
    window.localStorage.removeItem(FIRST_STREAM_KEY);
    return { count: 0, firstStreamAt: null };
  }

  const count = rawCount ? Number(rawCount) : 0;
  return { count: Number.isFinite(count) ? count : 0, firstStreamAt };
}

export function getDailyStreamCount(): number {
  return readState().count;
}

export function hasReachedStreamLimit(): boolean {
  return readState().count > FREE_STREAM_LIMIT;
}

export function recordStream(): number {
  if (typeof window === "undefined") return 0;

  const { count, firstStreamAt } = readState();
  const nextCount = count + 1;

  window.localStorage.setItem(COUNT_KEY, String(nextCount));
  if (!firstStreamAt) {
    window.localStorage.setItem(FIRST_STREAM_KEY, String(Date.now()));
  }

  return nextCount;
}
