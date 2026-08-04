"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useState } from "react";

const fieldClass =
  "w-full rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";
const labelClass = "text-xs font-medium text-black/60 dark:text-white/60";

export function LogoUploadForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [logoUploadUrl, setLogoUploadUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setLogoUploadUrl(null);
      setUploadError("");
      setUploadProgress(0);
      setUploading(true);
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/admin/logo-upload",
          onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
        });
        setLogoUploadUrl(blob.url);
      } catch {
        setUploadError("Upload failed. Please try again.");
        event.target.value = "";
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="logoFile">
          Logo image (square, at least 512x512 recommended — used as the
          artwork shown on lock screens and car displays)
        </label>
        <input
          id="logoFile"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={fieldClass}
        />
        <input type="hidden" name="logoUrl" value={logoUploadUrl ?? ""} />
        {uploading && (
          <p className="text-xs text-black/50 dark:text-white/50">
            Uploading... {uploadProgress.toFixed(0)}%
          </p>
        )}
        {logoUploadUrl && !uploading && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Upload complete.
          </p>
        )}
        {uploadError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {uploadError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={uploading || !logoUploadUrl}
        className="inline-flex items-center justify-center self-start rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
      >
        {uploading ? "Uploading..." : "Save logo"}
      </button>
    </form>
  );
}
