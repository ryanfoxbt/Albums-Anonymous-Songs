import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Emails whose visits are kept out of every admin analytics figure — the
 * site owners' own browsing. Matching is case-insensitive.
 *
 * An email only takes effect once it's tied to a visitor through the
 * Subscriber join (set when that address subscribes from a browser that
 * carries the aa_vid cookie). Until then it silently no-ops — e.g. an
 * owner browsing on a device where they never subscribed still counts.
 */
export const EXCLUDED_ANALYTICS_EMAILS = [
  "ryanfoxbt@gmail.com",
  "contact@permrecords.com",
] as const;

/** A `where` fragment that removes the excluded owners' subscriber rows. */
export const excludedSubscriberFilter = {
  NOT: {
    OR: EXCLUDED_ANALYTICS_EMAILS.map((email) => ({
      email: { equals: email, mode: "insensitive" as const },
    })),
  },
};

/**
 * Visitor ids linked to an excluded email. Memoised per request (every
 * analytics query calls this) via React's `cache`, so a dashboard render
 * resolves it once no matter how many widgets ask.
 */
export const getExcludedVisitorIds = cache(async (): Promise<string[]> => {
  const rows = await prisma.subscriber.findMany({
    where: {
      visitorId: { not: null },
      OR: EXCLUDED_ANALYTICS_EMAILS.map((email) => ({
        email: { equals: email, mode: "insensitive" as const },
      })),
    },
    select: { visitorId: true },
  });
  return rows.map((row) => row.visitorId as string);
});

/** `where` fragment for models with a direct `visitorId` column (SongPlayEvent, *LinkClick, DjMix). */
export function excludeByVisitorId(ids: string[]) {
  return ids.length ? { NOT: { visitorId: { in: ids } } } : {};
}

/** `where` fragment for the Visitor model itself. */
export function excludeByVisitorPk(ids: string[]) {
  return ids.length ? { NOT: { id: { in: ids } } } : {};
}

/** `where` fragment for models reached through a `session` relation (PageView). */
export function excludeBySessionVisitor(ids: string[]) {
  return ids.length ? { NOT: { session: { visitorId: { in: ids } } } } : {};
}
