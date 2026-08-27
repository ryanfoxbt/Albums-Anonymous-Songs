import type { Delta } from "@/lib/formatAnalytics";

const DELTA_CLASSES: Record<Delta["direction"], string> = {
  up: "text-[#006300] dark:text-[#0ca30c]",
  down: "text-[#d03b3b] dark:text-[#e66767]",
  flat: "text-black/40 dark:text-white/40",
};

export function StatCard({
  label,
  value,
  sublabel,
  delta,
}: {
  label: string;
  value: string;
  sublabel?: string;
  /** vs. the previous equal-length period; omit or pass null when there's nothing to compare. */
  delta?: Delta | null;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {delta && (
          <span className={`shrink-0 text-xs font-semibold ${DELTA_CLASSES[delta.direction]}`}>
            {delta.text}
          </span>
        )}
      </div>
      <span className="text-sm text-black/60 dark:text-white/60">{label}</span>
      {sublabel && (
        <span className="text-xs text-black/40 dark:text-white/40">
          {sublabel}
        </span>
      )}
    </div>
  );
}
