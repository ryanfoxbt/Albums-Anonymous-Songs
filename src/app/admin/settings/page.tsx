import Image from "next/image";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { LogoUploadForm } from "@/components/admin/LogoUploadForm";
import { getSiteLogoUrl } from "@/lib/siteSettings";
import { removeSiteLogo, updateSiteLogo } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const logoUrl = await getSiteLogoUrl();

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
    </div>
  );
}
