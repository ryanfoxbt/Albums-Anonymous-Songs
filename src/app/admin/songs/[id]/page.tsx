import { notFound } from "next/navigation";
import { SongForm } from "@/components/admin/SongForm";
import { prisma } from "@/lib/prisma";
import { getArtists, getCategories, getGenres } from "@/lib/songs";
import { updateSong } from "../actions";

export default async function EditSongPage({
  params,
  searchParams,
}: PageProps<"/admin/songs/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const [song, artists, genres, categories] = await Promise.all([
    prisma.song.findUnique({ where: { id } }),
    getArtists(),
    getGenres(),
    getCategories(),
  ]);

  if (!song) notFound();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit Song</h1>

      {typeof error === "string" && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <SongForm
        action={updateSong.bind(null, song.id)}
        artists={artists}
        genres={genres}
        categories={categories}
        song={song}
        submitLabel="Save Changes"
      />
    </div>
  );
}
