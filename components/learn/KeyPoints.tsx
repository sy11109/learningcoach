import { Star } from "lucide-react";
import { InlineText } from "@/components/ui/RichText";
import { cn } from "@/lib/utils";

export function KeyPointList({
  points,
  title = "本阶段重点",
  className,
}: {
  points: string[];
  title?: string;
  className?: string;
}) {
  if (points.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber/25 border-l-4 border-l-amber bg-amber-soft/70 px-4 py-3.5",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-amber">
        <Star size={12} fill="currentColor" />
        {title}
      </p>
      <ul className="mt-2 space-y-1.5 text-[12.5px]">
        {points.map((point, index) => (
          <li
            key={index}
            className="flex gap-2 leading-relaxed text-ink-soft"
          >
            <span className="tabular mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber/10 text-[9.5px] font-semibold text-amber">
              {index + 1}
            </span>
            <span className="min-w-0">
              <InlineText text={point} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
