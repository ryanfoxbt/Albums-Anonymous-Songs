import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { getUtmLinks } from "@/lib/analyticsQueries";
import { formatDateTime } from "@/lib/formatAnalytics";
import { createUtmLink } from "./actions";

const DESTINATIONS = ["/", "/listen", "/watch", "/press"];

const fieldClass =
  "w-full rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";
const labelClass = "text-xs font-medium text-black/60 dark:text-white/60";

function buildPath(link: {
  destinationPath: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string | null;
  utmContent: string | null;
}): string {
  const params = new URLSearchParams({
    utm_source: link.utmSource,
    utm_medium: link.utmMedium,
    utm_campaign: link.utmCampaign,
  });
  if (link.utmTerm) params.set("utm_term", link.utmTerm);
  if (link.utmContent) params.set("utm_content", link.utmContent);
  return `${link.destinationPath}?${params.toString()}`;
}

export default async function AdminAnalyticsUtmPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const links = await getUtmLinks();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <AnalyticsTabs active="/admin/analytics/utm" />

      <div className="grid gap-6 sm:grid-cols-[minmax(0,320px)_1fr]">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Build a link
          </h2>

          {typeof error === "string" && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <form action={createUtmLink} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="label">
                Label (for your own reference)
              </label>
              <input
                id="label"
                name="label"
                required
                placeholder="Spring newsletter blast"
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="destinationPath">
                Destination page
              </label>
              <select
                id="destinationPath"
                name="destinationPath"
                defaultValue="/"
                className={fieldClass}
              >
                {DESTINATIONS.map((path) => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="utmSource">
                utm_source
              </label>
              <input
                id="utmSource"
                name="utmSource"
                required
                placeholder="instagram"
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="utmMedium">
                utm_medium
              </label>
              <input
                id="utmMedium"
                name="utmMedium"
                required
                placeholder="social"
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="utmCampaign">
                utm_campaign
              </label>
              <input
                id="utmCampaign"
                name="utmCampaign"
                required
                placeholder="single-launch"
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="utmTerm">
                utm_term (optional)
              </label>
              <input id="utmTerm" name="utmTerm" className={fieldClass} />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="utmContent">
                utm_content (optional)
              </label>
              <input id="utmContent" name="utmContent" className={fieldClass} />
            </div>

            <button
              type="submit"
              className="mt-1 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Save link
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Saved links
          </h2>
          <ul className="flex flex-col gap-2">
            {links.map((link) => {
              const path = buildPath(link);
              return (
                <li
                  key={link.id}
                  className="flex flex-col gap-2 rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate font-medium">{link.label}</p>
                    <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
                      {formatDateTime(link.createdAt)}
                    </span>
                  </div>
                  <p className="truncate font-mono text-xs text-black/60 dark:text-white/60">
                    {path}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-black/50 dark:text-white/50">
                      {link.attributedSessions} attributed session
                      {link.attributedSessions === 1 ? "" : "s"}
                    </span>
                    <CopyLinkButton path={path} />
                  </div>
                </li>
              );
            })}
            {links.length === 0 && (
              <p className="text-sm text-black/50 dark:text-white/50">
                No links saved yet.
              </p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
