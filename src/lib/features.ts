// Simple build-time feature switches. Flip a value and redeploy; there's no
// runtime config or admin UI behind these on purpose — they exist so a
// half-finished or deliberately-parked feature can be hidden without ripping
// the code out.

export const FEATURES = {
  /**
   * Show the "Listed / Unlisted" filter in the DJ booth's song browser on the
   * public /dj page. The admin booth always shows it regardless.
   */
  djUnlistedFilter: false,
} as const;
