export function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-sm text-black/60 dark:text-white/60">{label}</span>
      {sublabel && (
        <span className="text-xs text-black/40 dark:text-white/40">
          {sublabel}
        </span>
      )}
    </div>
  );
}
