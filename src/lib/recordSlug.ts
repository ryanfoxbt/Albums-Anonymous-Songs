export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function randomSlug(): string {
  return crypto.randomUUID().split("-")[0];
}

export function randomEditToken(): string {
  return crypto.randomUUID();
}
