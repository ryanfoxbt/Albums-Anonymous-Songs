/** Canonical production origin, no trailing slash. */
export const SITE_URL = "https://albumsanonymous.com";

/** Build an absolute URL for a site-relative path (`/song/foo`). */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
