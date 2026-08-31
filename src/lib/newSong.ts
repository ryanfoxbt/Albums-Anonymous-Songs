// How long a song wears the "New" pill after it's added. Releases land
// roughly weekly, so two weeks keeps the latest one or two flagged.
export const NEW_SONG_WINDOW_DAYS = 14;

const WINDOW_MS = NEW_SONG_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** True when `createdAt` (ISO string) is within the "New" window. */
export function isNewSong(
  createdAt: string,
  now: number = Date.now(),
): boolean {
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && now - created <= WINDOW_MS;
}
