import { PACIFIC_TIME_ZONE } from "@/lib/timezone";

export type DateRange = { from: Date; to: Date };

export type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

// The admin dashboard is read in Pacific time, so "Today" and custom-range
// day boundaries need to line up with the Pacific calendar day, not
// whatever timezone the server process happens to run in (UTC on Vercel).
function pacificOffsetMsAt(utcInstantMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcInstantMs));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const asIfUtc = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    get("hour") === "24" ? 0 : Number(get("hour")),
    Number(get("minute")),
    Number(get("second")),
  );
  return asIfUtc - utcInstantMs;
}

function startOfPacificDay(date: Date): Date {
  const offset = pacificOffsetMsAt(date.getTime());
  const zoned = new Date(date.getTime() + offset);
  const zonedMidnightAsUtc = Date.UTC(
    zoned.getUTCFullYear(),
    zoned.getUTCMonth(),
    zoned.getUTCDate(),
  );
  return new Date(zonedMidnightAsUtc - offset);
}

function endOfPacificDay(date: Date): Date {
  return new Date(startOfPacificDay(date).getTime() + 24 * 60 * 60 * 1000 - 1);
}

function parseDateParam(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysForRange(range: DateRange): number {
  return Math.max(
    1,
    Math.ceil((range.to.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

/**
 * Resolves the admin analytics date-range picker (?range=today|7d|30d|90d
 * or ?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD) into concrete bounds.
 * Falls back to 30d for anything missing or malformed. "Today" and custom
 * bounds snap to Pacific-time calendar days.
 */
export function resolveDateRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): DateRange & { preset: RangePreset } {
  const now = new Date();

  if (params.range === "today") {
    return { from: startOfPacificDay(now), to: endOfPacificDay(now), preset: "today" };
  }

  if (params.range === "custom") {
    const from = parseDateParam(params.from);
    const to = parseDateParam(params.to);
    if (from && to && from <= to) {
      return {
        from: startOfPacificDay(from),
        to: endOfPacificDay(to),
        preset: "custom",
      };
    }
  }

  const days = (["7d", "30d", "90d"] as const).includes(
    params.range as "7d" | "30d" | "90d",
  )
    ? Number.parseInt(params.range as string, 10)
    : 30;
  const preset = `${days}d` as RangePreset;

  return {
    from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    to: now,
    preset,
  };
}
