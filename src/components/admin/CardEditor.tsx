"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { ArtistTradingCard } from "@/components/artist/ArtistTradingCard";
import type { ArtistCard, ArtistCardPatch } from "@/lib/artistCards";
import { saveArtistCard, resetArtistCardAction } from "@/app/(main)/admin/cards/actions";

const field =
  "w-full rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";
const labelClass = "text-xs font-medium text-black/60 dark:text-white/60";

function Text({
  id,
  value,
  onChange,
  label: labelText,
  textarea,
  rows,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelClass} htmlFor={id}>
        {labelText}
      </label>
      {textarea ? (
        <textarea
          id={id}
          value={value}
          rows={rows ?? 3}
          onChange={(e) => onChange(e.target.value)}
          className={`${field} resize-y`}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={field}
        />
      )}
    </div>
  );
}

export function CardEditor({
  slug,
  defaultCard,
  card,
  hasOverride,
}: {
  slug: string;
  defaultCard: ArtistCard;
  card: ArtistCard;
  hasOverride: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(card.name);
  const [title, setTitle] = useState(card.title);
  const [styleIcon, setStyleIcon] = useState(card.style.icon);
  const [styleLabel, setStyleLabel] = useState(card.style.label);
  const [statLabel, setStatLabel] = useState(card.stat.label);
  const [statValue, setStatValue] = useState(card.stat.value);
  const [tracks, setTracks] = useState(() =>
    [0, 1].map((i) => ({
      cost: card.tracks[i]?.cost ?? "",
      name: card.tracks[i]?.name ?? "",
      text: card.tracks[i]?.text ?? "",
      hype: card.tracks[i]?.hype ?? "",
    })),
  );
  const [bombsAt, setBombsAt] = useState(card.bombsAt);
  const [shrugsOff, setShrugsOff] = useState(card.shrugsOff);
  const [exitCost, setExitCost] = useState(card.exitCost);
  const [flavor, setFlavor] = useState(card.flavor);
  const [imageAlt, setImageAlt] = useState(card.imageAlt);
  const [rarity, setRarity] = useState<1 | 2 | 3>(card.rarity);
  const [accent, setAccent] = useState(card.accent);
  const [accentInk, setAccentInk] = useState(card.accentInk);
  const [imageUrl, setImageUrl] = useState<string | null>(
    card.image === defaultCard.image ? null : card.image,
  );

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadErr, setUploadErr] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const setTrack = (i: number, key: "cost" | "name" | "text" | "hype", v: string) =>
    setTracks((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, [key]: v } : t)),
    );

  const patch: ArtistCardPatch = useMemo(
    () => ({
      name,
      title,
      style: { icon: styleIcon, label: styleLabel },
      stat: { label: statLabel, value: statValue },
      tracks: tracks.map((t) => ({ ...t })),
      bombsAt,
      shrugsOff,
      exitCost,
      flavor,
      imageAlt,
      rarity,
      accent,
      accentInk,
    }),
    [
      name,
      title,
      styleIcon,
      styleLabel,
      statLabel,
      statValue,
      tracks,
      bombsAt,
      shrugsOff,
      exitCost,
      flavor,
      imageAlt,
      rarity,
      accent,
      accentInk,
    ],
  );

  const preview: ArtistCard = useMemo(
    () => ({
      ...defaultCard,
      ...patch,
      slug: defaultCard.slug,
      number: defaultCard.number,
      style: patch.style ?? defaultCard.style,
      stat: patch.stat ?? defaultCard.stat,
      tracks: patch.tracks ?? defaultCard.tracks,
      image: imageUrl || defaultCard.image,
    }),
    [defaultCard, patch, imageUrl],
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");
    setUploadPct(0);
    setUploading(true);
    try {
      const blob = await upload(`cards/${slug}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/cover-upload",
        onUploadProgress: ({ percentage }) => setUploadPct(percentage),
      });
      setImageUrl(blob.url);
    } catch {
      setUploadErr("Upload failed. Try again.");
      e.target.value = "";
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setStatus("idle");
    startTransition(async () => {
      try {
        await saveArtistCard(slug, patch, imageUrl);
        setStatus("saved");
        router.refresh();
      } catch (error) {
        setErrMsg(error instanceof Error ? error.message : "Save failed.");
        setStatus("error");
      }
    });
  }

  function resetToDefault() {
    if (
      !window.confirm(
        "Discard this card's customisations and go back to the built-in version?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await resetArtistCardAction(slug);
        setName(defaultCard.name);
        setTitle(defaultCard.title);
        setStyleIcon(defaultCard.style.icon);
        setStyleLabel(defaultCard.style.label);
        setStatLabel(defaultCard.stat.label);
        setStatValue(defaultCard.stat.value);
        setTracks(
          [0, 1].map((i) => ({
            cost: defaultCard.tracks[i]?.cost ?? "",
            name: defaultCard.tracks[i]?.name ?? "",
            text: defaultCard.tracks[i]?.text ?? "",
            hype: defaultCard.tracks[i]?.hype ?? "",
          })),
        );
        setBombsAt(defaultCard.bombsAt);
        setShrugsOff(defaultCard.shrugsOff);
        setExitCost(defaultCard.exitCost);
        setFlavor(defaultCard.flavor);
        setImageAlt(defaultCard.imageAlt);
        setRarity(defaultCard.rarity);
        setAccent(defaultCard.accent);
        setAccentInk(defaultCard.accentInk);
        setImageUrl(null);
        setStatus("idle");
        router.refresh();
      } catch (error) {
        setErrMsg(error instanceof Error ? error.message : "Reset failed.");
        setStatus("error");
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start">
      <div className="flex flex-col items-center gap-3 lg:sticky lg:top-6">
        <ArtistTradingCard card={preview} />
        <div className="flex w-full max-w-[360px] flex-col gap-2">
          <label className={labelClass} htmlFor="card-image">
            Card art {imageUrl ? "(custom upload)" : "(built-in default)"}
          </label>
          <input
            id="card-image"
            type="file"
            accept="image/*"
            onChange={onFile}
            className={field}
          />
          {uploading && (
            <p className="text-xs text-black/50 dark:text-white/50">
              Uploading… {uploadPct.toFixed(0)}%
            </p>
          )}
          {uploadErr && (
            <p className="text-xs text-red-600 dark:text-red-400">{uploadErr}</p>
          )}
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="self-start text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              Use the built-in art instead
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Text id="f-name" label="Name" value={name} onChange={setName} />
          <Text id="f-title" label="Title / subtitle" value={title} onChange={setTitle} />
          <Text id="f-style-icon" label="Style icon (emoji)" value={styleIcon} onChange={setStyleIcon} />
          <Text id="f-style-label" label="Style label" value={styleLabel} onChange={setStyleLabel} />
          <Text id="f-stat-label" label="Stat label" value={statLabel} onChange={setStatLabel} />
          <Text id="f-stat-value" label="Stat value" value={statValue} onChange={setStatValue} />
        </div>

        {tracks.map((t, i) => (
          <fieldset
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"
          >
            <legend className="px-1 text-xs font-semibold text-black/60 dark:text-white/60">
              Track {i + 1}
            </legend>
            <div className="grid gap-3 sm:grid-cols-[120px_1fr_90px]">
              <Text id={`t${i}-cost`} label="Cost (emoji)" value={t.cost} onChange={(v) => setTrack(i, "cost", v)} />
              <Text id={`t${i}-name`} label="Name" value={t.name} onChange={(v) => setTrack(i, "name", v)} />
              <Text id={`t${i}-hype`} label="HYPE" value={t.hype} onChange={(v) => setTrack(i, "hype", v)} />
            </div>
            <Text id={`t${i}-text`} label="Effect text" value={t.text} onChange={(v) => setTrack(i, "text", v)} textarea rows={2} />
          </fieldset>
        ))}

        <div className="grid gap-3 sm:grid-cols-3">
          <Text id="f-bombs" label="Bombs at" value={bombsAt} onChange={setBombsAt} />
          <Text id="f-shrugs" label="Shrugs off" value={shrugsOff} onChange={setShrugsOff} />
          <Text id="f-exit" label="Exit cost" value={exitCost} onChange={setExitCost} />
        </div>

        <Text id="f-flavor" label="Flavor text" value={flavor} onChange={setFlavor} textarea rows={2} />
        <Text id="f-alt" label="Image alt text" value={imageAlt} onChange={setImageAlt} textarea rows={2} />

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className={labelClass}>Rarity</span>
            <div className="flex gap-1">
              {([1, 2, 3] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRarity(r)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    rarity === r
                      ? "border-foreground bg-foreground text-background"
                      : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  }`}
                >
                  {"★".repeat(r)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="f-accent">
              Accent
            </label>
            <div className="flex items-center gap-2">
              <input
                id="f-accent"
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-9 w-12 rounded border border-black/15 dark:border-white/20"
              />
              <input
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className={`${field} w-28`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="f-ink">
              Accent ink
            </label>
            <div className="flex items-center gap-2">
              <input
                id="f-ink"
                type="color"
                value={accentInk}
                onChange={(e) => setAccentInk(e.target.value)}
                className="h-9 w-12 rounded border border-black/15 dark:border-white/20"
              />
              <input
                value={accentInk}
                onChange={(e) => setAccentInk(e.target.value)}
                className={`${field} w-28`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={save}
            disabled={pending || uploading}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save card"}
          </button>
          {(hasOverride || imageUrl) && (
            <button
              type="button"
              onClick={resetToDefault}
              disabled={pending}
              className="rounded-full border border-black/15 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-white/20 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Reset to built-in
            </button>
          )}
          {status === "saved" && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Saved.
            </span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600 dark:text-red-400">
              {errMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
