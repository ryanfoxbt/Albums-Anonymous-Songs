"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useState } from "react";
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
    durationSeconds: number | null;
    podcastEpisodeTitle: string | null;
    podcastEpisodeUrl: string | null;
    firstHeardOnEpisode: number | null;
    artistId: string;
    featuredArtistId: string | null;
    genreId: string;
    categoryId: string;
  };
  submitLabel: string;
}) {
  const [pendingPickers, setPendingPickers] = useState<Set<string>>(
    () => new Set(),
  );
  const [audioUploadUrl, setAudioUploadUrl] = useState<string | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState(0);
  const [audioUploadError, setAudioUploadError] = useState("");

  const handleAudioFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setAudioUploadUrl(null);
      setAudioUploadError("");
      setAudioUploadProgress(0);
      setAudioUploading(true);
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/admin/audio-upload",
          onUploadProgress: ({ percentage }) =>
            setAudioUploadProgress(percentage),
        });
        setAudioUploadUrl(blob.url);
      } catch {
        setAudioUploadError("Upload failed. Please try again.");
        event.target.value = "";
      } finally {
        setAudioUploading(false);
      }
    },
    [],
  );

  const handlePickerPending = useCallback((key: string, pending: boolean) => {
    setPendingPickers((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const handleArtistPending = useCallback(
    (pending: boolean) => handlePickerPending("artist", pending),
    [handlePickerPending],
  );
  const handleGenrePending = useCallback(
    (pending: boolean) => handlePickerPending("genre", pending),
    [handlePickerPending],
  );
  const handleCategoryPending = useCallback(
    (pending: boolean) => handlePickerPending("category", pending),
    [handlePickerPending],
  );
  const handleFeaturedArtistPending = useCallback(
    (pending: boolean) => handlePickerPending("featuredArtist", pending),
    [handlePickerPending],
  );

  const pickersPending = pendingPickers.size > 0;
  const audioRequired = !song && !audioUploadUrl;
  const submitDisabled = pickersPending || audioUploading || audioRequired;

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
          onPendingChange={handleArtistPending}
        />

        <EntityPicker
          name="genreId"
          label="Genre"
          fieldClass={fieldClass}
          initialOptions={genres}
          defaultSelectedId={song?.genreId}
          onCreate={quickCreateGenre}
          onPendingChange={handleGenrePending}
        />

        <EntityPicker
          name="categoryId"
          label="Category"
          fieldClass={fieldClass}
          initialOptions={categories}
          defaultSelectedId={song?.categoryId}
          onCreate={quickCreateCategory}
          onPendingChange={handleCategoryPending}
        />
      </div>

      <div className="max-w-xs">
        <EntityPicker
          name="featuredArtistId"
          label="Featured artist"
          fieldClass={fieldClass}
          initialOptions={artists}
          defaultSelectedId={song?.featuredArtistId ?? undefined}
          onCreate={quickCreateArtist}
          onPendingChange={handleFeaturedArtistPending}
          required={false}
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
          type="file"
          accept="audio/*"
          onChange={handleAudioFileChange}
          className={fieldClass}
        />
        <input type="hidden" name="audioUrl" value={audioUploadUrl ?? ""} />
        {audioUploading && (
          <p className="text-xs text-black/50 dark:text-white/50">
            Uploading... {audioUploadProgress.toFixed(0)}%
          </p>
        )}
        {audioUploadUrl && !audioUploading && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Upload complete.
          </p>
        )}
        {audioUploadError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {audioUploadError}
          </p>
        )}
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
        disabled={submitDisabled}
        className="mt-2 inline-flex items-center justify-center self-start rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
      >
        {pickersPending
          ? "Finishing add..."
          : audioUploading
            ? "Uploading audio..."
            : submitLabel}
      </button>
    </form>
  );
}
