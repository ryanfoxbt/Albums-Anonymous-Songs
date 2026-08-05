import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { prisma } from "@/lib/prisma";
import { createGenre, deleteGenre, updateGenre } from "./actions";

const fieldClass =
  "min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-transparent";

export default async function AdminGenresPage({
  searchParams,
}: PageProps<"/admin/genres">) {
  const { error } = await searchParams;
  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { songs: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Genres</h1>

      {typeof error === "string" && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        action={createGenre}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
      >
        <input
          name="name"
          type="text"
          placeholder="Genre name"
          required
          className={fieldClass}
        />
        <input
          name="slug"
          type="text"
          placeholder="slug (optional)"
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
        {genres.map((genre) => (
          <li
            key={genre.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
          >
            <form
              action={updateGenre.bind(null, genre.id)}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            >
              <input
                name="name"
                type="text"
                defaultValue={genre.name}
                required
                className={fieldClass}
              />
              <input
                name="slug"
                type="text"
                defaultValue={genre.slug}
                className={fieldClass}
              />
              <span className="text-xs text-black/50 dark:text-white/50">
                {genre._count.songs} song(s)
              </span>
              <button
                type="submit"
                className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Save
              </button>
            </form>
            <form action={deleteGenre}>
              <input type="hidden" name="genreId" value={genre.id} />
              <ConfirmSubmitButton
                confirmMessage={`Delete "${genre.name}"?`}
                className="rounded-full border border-black/15 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-white/20 dark:text-red-400 dark:hover:bg-red-950/40"
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
