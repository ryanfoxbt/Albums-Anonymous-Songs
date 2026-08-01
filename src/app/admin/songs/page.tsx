import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { formatArtistCredit } from "@/lib/artistCredit";
import { prisma } from "@/lib/prisma";
import { deleteSong } from "./actions";

export default async function AdminSongsPage({
  searchParams,
}: PageProps<"/admin/songs">) {
  const { error } = await searchParams;
  const songs = await prisma.song.findMany({
    include: {
      artist: true,
      featuredArtist: true,
      genre: true,
      category: true,
    },
    orderBy: { title: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Songs</h1>
        <Link
          href="/admin/songs/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          + New Song
        </Link>
      </div>

      {typeof error === "string" && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <ul className="flex flex-col gap-2">
        {songs.map((song) => (
          <li
            key={song.id}
            className="flex items-center gap-3 rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{song.title}</p>
              <p className="truncate text-black/50 dark:text-white/50">
                {formatArtistCredit(song)} · {song.genre.name} ·{" "}
                {song.category.name}
              </p>
            </div>
            <Link
              href={`/admin/songs/${song.id}`}
              className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Edit
            </Link>
            <form action={deleteSong}>
              <input type="hidden" name="songId" value={song.id} />
              <ConfirmSubmitButton
                confirmMessage={`Delete "${song.title}"? This can't be undone.`}
                className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:border-white/20 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          </li>
        ))}
        {songs.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">
            No songs yet.
          </p>
        )}
      </ul>
    </div>
  );
}
