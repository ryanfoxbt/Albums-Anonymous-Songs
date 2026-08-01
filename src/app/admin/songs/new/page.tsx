import { SongForm } from "@/components/admin/SongForm";
import { getArtists, getCategories, getGenres } from "@/lib/songs";
import { createSong } from "../actions";

export default async function NewSongPage({
  searchParams,
}: PageProps<"/admin/songs/new">) {
  const { error } = await searchParams;
  const [artists, genres, categories] = await Promise.all([
    getArtists(),
    getGenres(),
    getCategories(),
  ]);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">New Song</h1>

      {typeof error === "string" && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <SongForm
        action={createSong}
        artists={artists}
        genres={genres}
        categories={categories}
        submitLabel="Create Song"
      />
    </div>
  );
}
