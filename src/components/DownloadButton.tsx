"use client";

import { useState } from "react";
import { EmailGateDialog } from "@/components/EmailGateDialog";
import { isEmailUnlocked } from "@/lib/emailGate";

export function DownloadButton({
  slug,
  className,
  label = "Download MP3",
}: {
  slug: string;
  className?: string;
  label?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const startDownload = () => {
    const a = document.createElement("a");
    a.href = `/api/download/song/${encodeURIComponent(slug)}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleClick = () => {
    if (isEmailUnlocked()) {
      startDownload();
    } else {
      setDialogOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        }
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden>
          <path d="M8 1.5a.75.75 0 0 1 .75.75v6.44l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 8.83a.75.75 0 0 1 1.06-1.06l1.97 1.97V2.25A.75.75 0 0 1 8 1.5ZM3 12.5a.75.75 0 0 1 .75.75v.25c0 .14.11.25.25.25h8a.25.25 0 0 0 .25-.25v-.25a.75.75 0 0 1 1.5 0v.25A1.75 1.75 0 0 1 12 15.25H4a1.75 1.75 0 0 1-1.75-1.75v-.25A.75.75 0 0 1 3 12.5Z" />
        </svg>
        {label}
      </button>

      <EmailGateDialog
        open={dialogOpen}
        reason="download"
        onClose={() => setDialogOpen(false)}
        onUnlocked={() => {
          setDialogOpen(false);
          startDownload();
        }}
      />
    </>
  );
}
