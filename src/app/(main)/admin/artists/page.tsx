import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { prisma } from "@/lib/prisma";
import { createArtist, deleteArtist, updateArtist } from "./actions";

const fieldClass =
  "min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-transparent";

export default async function AdminArtistsPage({
  searchParams,
}: PageProps<"/admin/artists">) {
  const { error } = await searchParams;
  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { songs: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Artists</h1>

      {typeof error === "string" && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        action={createArtist}
        className="flex flex-col gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="name"
            type="text"
            placeholder="Artist name"
            required
            className={fieldClass}
          />
          <input
            name="slug"
            type="text"
            placeholder="slug (optional)"
            className={fieldClass}
          />
        </div>
        <textarea
          name="bio"
          placeholder="Bio (optional)"
          rows={2}
          className={fieldClass}
        />
        <button
          type="submit"
          className="self-start rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90"
        >
          Add
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {artists.map((artist) => (
          <li
            key={artist.id}
            className="flex flex-col gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
          >
            <form
              action={updateArtist.bind(null, artist.id)}
              className="flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  name="name"
                  type="text"
                  defaultValue={artist.name}
                  required
                  className={fieldClass}
                />
                <input
                  name="slug"
                  type="text"
                  defaultValue={artist.slug}
                  className={fieldClass}
                />
                <span className="text-xs text-black/50 dark:text-white/50">
                  {artist._count.songs} song(s)
                </span>
              </div>
              <textarea
                name="bio"
                defaultValue={artist.bio ?? undefined}
                rows={2}
                className={fieldClass}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Save
                </button>
              </div>
            </form>
            <form action={deleteArtist}>
              <input type="hidden" name="artistId" value={artist.id} />
              <ConfirmSubmitButton
                confirmMessage={`Delete "${artist.name}"?`}
                className="self-start rounded-full border border-black/15 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-white/20 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
