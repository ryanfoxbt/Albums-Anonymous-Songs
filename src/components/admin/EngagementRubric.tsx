import {
  ENGAGEMENT_RUBRIC,
  ENGAGEMENT_THRESHOLD,
  ENGAGEMENT_TIERS,
  MAX_ENGAGEMENT_SCORE,
} from "@/lib/engagementRubric";
import { InfoTooltip } from "@/components/admin/InfoTooltip";

/** The scoring rubric as a compact table — reused inside the tooltip and on the report. */
export function EngagementRubricTable() {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-black/80 dark:text-white/80">
        Engagement score
      </p>
      <p>
        Each visitor earns points for things a casual first-timer rarely does.
        Points are added up all-time (per browser). A visitor at{" "}
        <strong>{ENGAGEMENT_THRESHOLD}+</strong> is &ldquo;engaged&rdquo; and is
        shown the merch link; {MAX_ENGAGEMENT_SCORE} is the max.
      </p>
      <table className="w-full border-collapse">
        <tbody>
          {ENGAGEMENT_RUBRIC.map((rule) => (
            <tr
              key={rule.id}
              className="border-b border-black/5 last:border-0 dark:border-white/10"
            >
              <td className="py-1 pr-2 align-top font-semibold tabular-nums">
                +{rule.points}
              </td>
              <td className="py-1">
                <span className="font-medium text-black/80 dark:text-white/80">
                  {rule.label}
                </span>
                <span className="block text-black/50 dark:text-white/50">
                  {rule.hint}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-1 pt-1">
        {ENGAGEMENT_TIERS.map((tier) => (
          <span
            key={tier.id}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tier.className}`}
          >
            {tier.label} · {tier.min}
            {tier.max >= MAX_ENGAGEMENT_SCORE ? "+" : `–${tier.max}`}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The "ⓘ" tooltip trigger wrapping {@link EngagementRubricTable}. */
export function EngagementRubricTooltip({
  align = "left",
}: {
  align?: "left" | "right";
}) {
  return (
    <InfoTooltip label="How engagement scoring works" align={align} width="w-80">
      <EngagementRubricTable />
    </InfoTooltip>
  );
}
