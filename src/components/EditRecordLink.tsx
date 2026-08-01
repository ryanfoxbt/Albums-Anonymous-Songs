"use client";

import Link from "next/link";
import { useStoredEditToken } from "@/lib/recordEditStorage";

export function EditRecordLink({ slug }: { slug: string }) {
  const editToken = useStoredEditToken(slug);

  if (!editToken) return null;

  return (
    <Link
      href={`/record/${slug}/edit`}
      className="self-center text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
    >
      Edit this record
    </Link>
  );
}
