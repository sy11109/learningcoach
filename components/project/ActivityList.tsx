import {
  BookOpen,
  ClipboardCheck,
  MessageSquareQuote,
  Target,
  type LucideIcon,
} from "lucide-react";
import { relativeTime } from "@/lib/utils";
import type { ActivityItem, ActivityKind } from "@/lib/types";

const ICONS: Record<ActivityKind, LucideIcon> = {
  assessment: Target,
  lesson: BookOpen,
  exam: ClipboardCheck,
  feynman: MessageSquareQuote,
};

const TONES: Record<ActivityKind, string> = {
  assessment: "bg-amber-soft text-amber",
  lesson: "bg-[#e0f2fe] text-[#0369a1]",
  exam: "bg-accent-soft text-accent",
  feynman: "bg-[#ede9fe] text-[#6d28d9]",
};

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-[12.5px] leading-relaxed text-muted">
        还没有学习记录。开始学习内容、完成阶段定位、考试或费曼复述后，会出现在这里。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line/80">
      {items.map((item) => {
        const Icon = ICONS[item.kind];
        return (
          <li key={`${item.kind}-${item.id}`} className="flex gap-3 px-5 py-3.5">
            <span
              className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${TONES[item.kind]}`}
            >
              <Icon size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-[13px] font-medium text-ink">
                  {item.title}
                </p>
                <span className="shrink-0 text-[10.5px] text-muted">
                  {relativeTime(item.at)}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                {item.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
