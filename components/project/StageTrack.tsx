import { STAGE_META, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES: Stage[] = [1, 2, 3, 4, 5];

export function StageTrack({
  currentStage,
  compact = false,
}: {
  currentStage: Stage | null;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {STAGES.map((stage) => {
        const reached = currentStage !== null && stage <= currentStage;
        const current = stage === currentStage;
        const meta = STAGE_META[stage];
        return (
          <div key={stage} className="flex flex-col items-center">
            <div
              className={cn(
                "h-1 w-full rounded-full",
                reached ? "bg-accent" : "bg-line",
              )}
            />
            <span
              className={cn(
                "tabular mt-2 grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold",
                current
                  ? "bg-accent text-white ring-4 ring-accent/10"
                  : reached
                    ? "bg-accent-soft text-accent-deep"
                    : "bg-paper-deep text-muted",
              )}
            >
              {stage}
            </span>
            <span
              className={cn(
                "mt-1 text-[10px]",
                current ? "font-semibold text-ink" : "text-muted",
              )}
            >
              {meta.short}
            </span>
            {!compact ? (
              <span className="mt-0.5 hidden text-[9px] text-muted/80 sm:block">
                {meta.tagline}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
