export type MerchVariant = "a" | "b";

/**
 * Deterministically buckets a visitor into the "a" or "b" merch-link copy
 * variant from their aa_vid cookie. No assignment is stored per-visitor —
 * the same visitorId always hashes to the same variant, so copy stays
 * stable across pageviews without an extra DB write per visitor.
 */
export function pickMerchVariant(visitorId: string | null | undefined): MerchVariant {
  if (!visitorId) return "a";
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = (hash * 31 + visitorId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? "a" : "b";
}
