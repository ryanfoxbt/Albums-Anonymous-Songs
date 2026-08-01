"use client";

import { quickCreateArtist } from "@/app/admin/artists/actions";
import { quickCreateCategory } from "@/app/admin/categories/actions";
import { quickCreateGenre } from "@/app/admin/genres/actions";
import type { ArtistSummary, CategorySummary, GenreSummary } from "@/lib/songs";
import { EntityPicker } from "./EntityPicker";

const fieldClass =
  "w-full rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";
const labelClass = "text-xs font-medium text-black/60 dark:text-white/60";

export function SongForm({
  action,
  artists,
  genres,
  categories,
  song,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  artists: ArtistSummary[];
  genres: GenreSummary[];
  categories: CategorySummary[];
  song?: {
    title: string;
    slug: string;
    audioUrl: string;
    coverImageUrl: string | null;
    durationSeconds: number | null;
    podcastEpisodeTitle: string | null;
    podcastEpisodeUrl: string | null;
    firstHeardOnEpisode: number | null;
    artistId: string;
    genreId: string;
    categoryId: string;
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={song?.title}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="slug">
          URL slug (optional — auto-generated from title if left blank)
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          defaultValue={song?.slug}
          placeholder="my-song-title"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <EntityPicker
          name="artistId"
          label="Artist"
          fieldClass={fieldClass}
          initialOptions={artists}
          defaultSelectedId={song?.artistId}
          onCreate={quickCreateArtist}
        />

        <EntityPicker
          name="genreId"
          label="Genre"
          fieldClass={fieldClass}
          initialOptions={genres}
          defaultSelectedId={song?.genreId}
          onCreate={quickCreateGenre}
        />

        <EntityPicker
          name="categoryId"
          label="Category"
          fieldClass={fieldClass}
          initialOptions={categories}
          defaultSelectedId={song?.categoryId}
          onCreate={quickCreateCategory}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="audioFile">
          Audio file{song ? " (leave blank to keep current file)" : ""}
        </label>
        {song && (
          <a
            href={song.audioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-black/50 underline dark:text-white/50"
          >
            Current file
          </a>
        )}
        <input
          id="audioFile"
          name="audioFile"
          type="file"
          accept="audio/*"
          required={!song}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="coverFile">
          Cover image{song ? " (leave blank to keep current image)" : ""}
        </label>
        {song?.coverImageUrl && (
          <a
            href={song.coverImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-black/50 underline dark:text-white/50"
          >
            Current image
          </a>
        )}
        <input
          id="coverFile"
          name="coverFile"
          type="file"
          accept="image/*"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="durationSeconds">
          Duration (seconds, optional)
        </label>
        <input
          id="durationSeconds"
          name="durationSeconds"
          type="number"
          min={0}
          defaultValue={song?.durationSeconds ?? undefined}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="podcastEpisodeTitle">
          Podcast episode title (optional)
        </label>
        <input
          id="podcastEpisodeTitle"
          name="podcastEpisodeTitle"
          type="text"
          defaultValue={song?.podcastEpisodeTitle ?? undefined}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="podcastEpisodeUrl">
          Podcast episode URL (optional)
        </label>
        <input
          id="podcastEpisodeUrl"
          name="podcastEpisodeUrl"
          type="url"
          defaultValue={song?.podcastEpisodeUrl ?? undefined}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="firstHeardOnEpisode">
          First heard on episode # (optional)
        </label>
        <input
          id="firstHeardOnEpisode"
          name="firstHeardOnEpisode"
          type="number"
          min={0}
          defaultValue={song?.firstHeardOnEpisode ?? undefined}
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center self-start rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
