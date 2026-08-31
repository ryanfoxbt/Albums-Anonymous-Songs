import Image from "next/image";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { LogoUploadForm } from "@/components/admin/LogoUploadForm";
import { getMerchAbResults } from "@/lib/analyticsQueries";
import { ENGAGEMENT_THRESHOLD } from "@/lib/merchEngagement";
import { formatPercent } from "@/lib/formatAnalytics";
import { getAnnouncement, getMerchAbTest, getSiteLogoUrl } from "@/lib/siteSettings";
import {
  removeSiteLogo,
  updateAnnouncement,
  updateMerchAbTest,
  updateSiteLogo,
} from "./actions";

export const dynamic = "force-dynamic";

const fieldClass =
  "w-full rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";
const labelClass = "text-xs font-medium text-black/60 dark:text-white/60";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const logoUrl = await getSiteLogoUrl();
  const announcement = await getAnnouncement();
  const merchAbTest = await getMerchAbTest();
  const merchAbResults = await getMerchAbResults({
    variantAText: merchAbTest.variantAText,
    variantBText: merchAbTest.variantBText,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {typeof error === "string" && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div>
          <h2 className="text-sm font-semibold">Site logo</h2>
          <p className="text-xs text-black/50 dark:text-white/50">
            Shown as the artwork in the &quot;Now Playing&quot; display on
            lock screens, Bluetooth head units, and CarPlay/Android Auto —
            replaces the generic default artwork.
          </p>
        </div>

        {logoUrl && (
          <div className="flex items-center gap-3">
            <Image
              src={logoUrl}
              alt="Current site logo"
              width={96}
              height={96}
              className="h-24 w-24 rounded-xl border border-black/10 object-cover dark:border-white/10"
              unoptimized
            />
            <form action={removeSiteLogo}>
              <ConfirmSubmitButton
                confirmMessage="Remove the site logo? Car and lock-screen displays will fall back to the default artwork."
                className="rounded-full border border-black/15 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-white/20 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove
              </ConfirmSubmitButton>
            </form>
          </div>
        )}

        <LogoUploadForm action={updateSiteLogo} />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div>
          <h2 className="text-sm font-semibold">Announcement banner</h2>
          <p className="text-xs text-black/50 dark:text-white/50">
            Shown at the top of every page while enabled. Visitors can
            dismiss it, but it reappears for anyone who hasn&apos;t seen the
            current message yet.
          </p>
        </div>

        <form action={updateAnnouncement} className="flex flex-col gap-3">
          <textarea
            name="text"
            defaultValue={announcement.text ?? ""}
            rows={2}
            placeholder="e.g. New Smelly Release! Smellevator Dropped a Double Deuce!"
            className="w-full resize-none rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm placeholder:text-black/40 dark:border-white/20 dark:placeholder:text-white/40"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name="linkText"
              defaultValue={announcement.linkText ?? ""}
              placeholder="Link label (e.g. Listen here.)"
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm placeholder:text-black/40 dark:border-white/20 dark:placeholder:text-white/40 sm:w-1/3"
            />
            <input
              type="text"
              name="linkUrl"
              defaultValue={announcement.linkUrl ?? ""}
              placeholder="Link URL (e.g. /record/smellevator)"
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm placeholder:text-black/40 dark:border-white/20 dark:placeholder:text-white/40"
            />
          </div>
          <p className="text-xs text-black/40 dark:text-white/40">
            Optional. The label is appended to the end of the message as a
            clickable link — leave it blank to just show the URL.
          </p>

          <fieldset className="flex items-center gap-4 text-sm">
            <legend className="mb-1 w-full text-xs font-medium text-black/50 dark:text-white/50">
              Link style
            </legend>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="linkStyle"
                value="link"
                defaultChecked={announcement.linkStyle !== "button"}
                className="h-4 w-4 border-black/30 dark:border-white/30"
              />
              Inline link
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="linkStyle"
                value="button"
                defaultChecked={announcement.linkStyle === "button"}
                className="h-4 w-4 border-black/30 dark:border-white/30"
              />
              Button
            </label>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="hideOnHome"
              defaultChecked={announcement.hideOnHome}
              className="h-4 w-4 rounded border-black/30 dark:border-white/30"
            />
            Hide on the home page
          </label>
          <p className="-mt-2 text-xs text-black/40 dark:text-white/40">
            The banner is also automatically hidden on the link&apos;s own
            page — no point sending someone to a page they&apos;re already
            on.
          </p>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={announcement.enabled}
              className="h-4 w-4 rounded border-black/30 dark:border-white/30"
            />
            Show banner
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Save
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div>
          <h2 className="text-sm font-semibold">Merch link A/B test</h2>
          <p className="text-xs text-black/50 dark:text-white/50">
            The header&apos;s small handwritten link next to &quot;About&quot;
            (currently &quot;{merchAbTest.variantAText}&quot;). Visitors are
            deterministically split 50/50 between the two variants below —
            the same visitor always sees the same one.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {merchAbResults.map((result) => (
            <div
              key={result.variant}
              className="rounded-xl border border-black/10 p-3 dark:border-white/10"
            >
              <p className="text-xs font-medium text-black/50 dark:text-white/50">
                Variant {result.variant.toUpperCase()}
              </p>
              <p className="mt-0.5 text-sm font-medium">
                &quot;{result.text}&quot;
              </p>
              <p className="mt-2 text-xs text-black/60 dark:text-white/60">
                {result.clicks} click{result.clicks === 1 ? "" : "s"} /{" "}
                {result.visitors} visitor{result.visitors === 1 ? "" : "s"} ·{" "}
                {formatPercent(result.clickRate)} click rate
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-black/40 dark:text-white/40">
          All-time, not scoped to a date range.
        </p>

        <form action={updateMerchAbTest} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="variantAText">
              Variant A text
            </label>
            <input
              id="variantAText"
              name="variantAText"
              type="text"
              required
              defaultValue={merchAbTest.variantAText}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="variantBText">
              Variant B text
            </label>
            <input
              id="variantBText"
              name="variantBText"
              type="text"
              required
              defaultValue={merchAbTest.variantBText}
              className={fieldClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={merchAbTest.enabled}
              className="h-4 w-4 rounded border-black/30 dark:border-white/30"
            />
            Run the test (unchecked always shows Variant A)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="linkGateEnabled"
              defaultChecked={merchAbTest.linkGateEnabled}
              className="h-4 w-4 rounded border-black/30 dark:border-white/30"
            />
            Hide the link until a visitor is engaged
          </label>
          <p className="-mt-2 text-xs text-black/40 dark:text-white/40">
            On by default. The link only appears once a visitor clears an
            engagement score of {ENGAGEMENT_THRESHOLD} — earned from things
            like returning, subscribing, recording a mix, playing 3+ songs,
            or 5+ minutes of listening. Untick to show it to everyone.
          </p>

          <button
            type="submit"
            className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Save
          </button>
        </form>
      </section>
    </div>
  );
}
