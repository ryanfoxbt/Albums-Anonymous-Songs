"use client";

import Link from "next/link";
import type { SongWithRelations } from "@/lib/songs";
import { useStoredEditToken } from "@/lib/recordEditStorage";
import { RecordBuilder } from "./RecordBuilder";

export function EditRecordClient({
  slug,
  songs,
  initialSelectedIds,
}: {
  slug: string;
  songs: SongWithRelations[];
  initialSelectedIds: string[];
}) {
  const editToken = useStoredEditToken(slug);

  if (!editToken) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-black/60 dark:text-white/60">
          This record can only be edited from the browser it was pressed in.
        </p>
        <Link
          href={`/record/${slug}`}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Back to the record
        </Link>
      </div>
    );
  }

  return (
    <RecordBuilder
      songs={songs}
      mode="edit"
      slug={slug}
      editToken={editToken}
      initialSelectedIds={initialSelectedIds}
    />
  );
}
