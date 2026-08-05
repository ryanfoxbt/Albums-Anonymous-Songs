import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { prisma } from "@/lib/prisma";
import { createSocialLink, deleteSocialLink, updateSocialLink } from "./actions";

const fieldClass =
  "min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-transparent";

export const dynamic = "force-dynamic";

export default async function AdminSocialLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const links = await prisma.socialLink.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Social Links</h1>

      {typeof error === "string" && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        action={createSocialLink}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
      >
        <input
          name="name"
          type="text"
          placeholder="Platform name (e.g. Instagram)"
          required
          className={fieldClass}
        />
        <input
          name="href"
          type="url"
          placeholder="https://..."
          required
          className={fieldClass}
        />
        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90"
        >
          Add
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li
            key={link.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
          >
            <form
              action={updateSocialLink.bind(null, link.id)}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            >
              <input
                name="name"
                type="text"
                defaultValue={link.name}
                required
                className={fieldClass}
              />
              <input
                name="href"
                type="url"
                defaultValue={link.href}
                required
                className={fieldClass}
              />
              <button
                type="submit"
                className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Save
              </button>
            </form>
            <form action={deleteSocialLink}>
              <input type="hidden" name="id" value={link.id} />
              <ConfirmSubmitButton
                confirmMessage={`Delete "${link.name}"?`}
                className="rounded-full border border-black/15 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-white/20 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          </li>
        ))}
        {links.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">
            No social links yet.
          </p>
        )}
      </ul>
    </div>
  );
}
