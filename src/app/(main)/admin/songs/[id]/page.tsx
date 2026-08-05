import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { SongForm } from "@/components/admin/SongForm";
import { formatDateTime } from "@/lib/formatAnalytics";
import { prisma } from "@/lib/prisma";
import { getArtists, getCategories, getGenres } from "@/lib/songs";
import { createDownloadLink, revokeDownloadLink, updateSong } from "../actions";

export default async function EditSongPage({
  params,
  searchParams,
}: PageProps<"/admin/songs/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const [song, artists, genres, categories, downloadLinks] = await Promise.all([
    prisma.song.findUnique({ where: { id } }),
    getArtists(),
    getGenres(),
    getCategories(),
    prisma.songDownloadLink.findMany({
      where: { songId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!song) notFound();

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div className="flex flex-col gap-6">
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

      <div className="flex flex-col gap-3 border-t border-black/10 pt-6 dark:border-white/10">
        <h2 className="text-lg font-semibold tracking-tight">Download links</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          The song page is stream-only. Generate a link here to send someone
          the track directly — no login required.
        </p>

        <form action={createDownloadLink} className="flex gap-2">
          <input type="hidden" name="songId" value={song.id} />
          <input
            name="label"
            placeholder="Who's this for? (optional)"
            className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Generate link
          </button>
        </form>

        <ul className="flex flex-col gap-2">
          {downloadLinks.map((link) => {
            const path = `/api/download/link/${link.id}`;
            return (
              <li
                key={link.id}
                className="flex flex-col gap-2 rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-medium">
                    {link.label || "Untitled link"}
                  </p>
                  <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
                    {formatDateTime(link.createdAt)}
                  </span>
                </div>
                <p className="truncate font-mono text-xs text-black/60 dark:text-white/60">
                  {path}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-black/50 dark:text-white/50">
                    {link.revokedAt
                      ? "Revoked"
                      : `${link.downloadCount} download${
                          link.downloadCount === 1 ? "" : "s"
                        }`}
                  </span>
                  <div className="flex items-center gap-2">
                    {!link.revokedAt && <CopyLinkButton path={path} />}
                    {!link.revokedAt && (
                      <form action={revokeDownloadLink}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <input type="hidden" name="songId" value={song.id} />
                        <ConfirmSubmitButton
                          confirmMessage="Revoke this download link? It will stop working immediately."
                          className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                        >
                          Revoke
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {downloadLinks.length === 0 && (
            <p className="text-sm text-black/50 dark:text-white/50">
              No download links yet.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
