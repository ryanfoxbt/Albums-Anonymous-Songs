import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { prisma } from "@/lib/prisma";
import { createCategory, deleteCategory, updateCategory } from "./actions";

const fieldClass =
  "min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-transparent";

export default async function AdminCategoriesPage({
  searchParams,
}: PageProps<"/admin/categories">) {
  const { error } = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { songs: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Categories</h1>

      {typeof error === "string" && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        action={createCategory}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
      >
        <input
          name="name"
          type="text"
          placeholder="Category name"
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
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
          >
            <form
              action={updateCategory.bind(null, category.id)}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            >
              <input
                name="name"
                type="text"
                defaultValue={category.name}
                required
                className={fieldClass}
              />
              <input
                name="slug"
                type="text"
                defaultValue={category.slug}
                className={fieldClass}
              />
              <span className="text-xs text-black/50 dark:text-white/50">
                {category._count.songs} song(s)
              </span>
              <button
                type="submit"
                className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Save
              </button>
            </form>
            <form action={deleteCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <ConfirmSubmitButton
                confirmMessage={`Delete "${category.name}"?`}
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
