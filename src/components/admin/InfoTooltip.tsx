"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Small "ⓘ" affordance that reveals a panel on hover, focus, or tap. Used
 * for inline explanations in the admin dashboards (e.g. the engagement
 * rubric). Content is arbitrary JSX so callers control the layout.
 */
export function InfoTooltip({
  children,
  label = "More information",
  align = "left",
  width = "w-72",
}: {
  children: ReactNode;
  label?: string;
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-black/25 text-[10px] font-bold leading-none text-black/50 hover:border-black/50 hover:text-black/80 dark:border-white/25 dark:text-white/50 dark:hover:border-white/50 dark:hover:text-white/80"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-6 z-50 ${width} ${
            align === "right" ? "right-0" : "left-0"
          } rounded-xl border border-black/10 bg-background p-3 text-left text-xs font-normal leading-relaxed text-black/70 shadow-lg dark:border-white/15 dark:text-white/70`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
