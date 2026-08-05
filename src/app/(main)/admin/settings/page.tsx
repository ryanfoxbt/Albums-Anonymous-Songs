import Image from "next/image";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { LogoUploadForm } from "@/components/admin/LogoUploadForm";
import { getAnnouncement, getSiteLogoUrl } from "@/lib/siteSettings";
import { removeSiteLogo, updateAnnouncement, updateSiteLogo } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const logoUrl = await getSiteLogoUrl();
  const announcement = await getAnnouncement();

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
            placeholder="e.g. New episode out now — give it a listen!"
            className="w-full resize-none rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm placeholder:text-black/40 dark:border-white/20 dark:placeholder:text-white/40"
          />
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
    </div>
  );
}
