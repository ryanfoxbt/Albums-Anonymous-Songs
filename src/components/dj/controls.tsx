// Small shared control widgets for the DJ board — a labelled range slider
// and a "pedal" toggle-plus-mix row — used by both the decks and the live
// guitar input panel.

export function MiniSlider({
  label,
  valueLabel,
  title,
  ...inputProps
}: {
  label: string;
  valueLabel: string;
  title?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-0.5 text-[10px]" title={title}>
      <span className="flex justify-between text-black/50 dark:text-white/50">
        <span>{label}</span>
        <span>{valueLabel}</span>
      </span>
      <input type="range" className="w-full accent-foreground" {...inputProps} />
    </label>
  );
}

const panLabel = (pan: number) => {
  if (Math.abs(pan) < 0.005) return "C";
  const amt = Math.round(Math.abs(pan) * 100);
  return pan < 0 ? `L${amt}` : `R${amt}`;
};

// Level + pan for the live instrument against the DJ music.
export function MixControls({
  level,
  pan,
  levelDefault,
  onLevel,
  onPan,
}: {
  level: number;
  pan: number;
  levelDefault: number;
  onLevel: (value: number) => void;
  onPan: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <MiniSlider
        label="Level"
        valueLabel={`${Math.round(level * 100)}%`}
        min={0}
        max={1}
        step={0.01}
        value={level}
        onChange={(e) => onLevel(Number(e.target.value))}
        onDoubleClick={() => onLevel(levelDefault)}
      />
      <MiniSlider
        label="Pan"
        valueLabel={panLabel(pan)}
        min={-1}
        max={1}
        step={0.02}
        value={pan}
        onChange={(e) => onPan(Number(e.target.value))}
        onDoubleClick={() => onPan(0)}
      />
    </div>
  );
}

export function FxToggle({
  label,
  on,
  onToggle,
  mix,
  onMixChange,
  max = 0.6,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  mix: number;
  onMixChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`w-16 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
          on
            ? "border-foreground bg-foreground text-background"
            : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        }`}
      >
        {label}
      </button>
      <input
        type="range"
        min={0}
        max={max}
        step={0.01}
        value={mix}
        disabled={!on}
        onChange={(e) => onMixChange(Number(e.target.value))}
        className="flex-1 accent-foreground disabled:opacity-30"
      />
    </div>
  );
}
