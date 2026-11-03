import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export function ModuleCard({
  href,
  icon: Icon,
  title,
  description,
  stat,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_12px_26px_-22px_rgba(14,107,82,0.55)]"
    >
      <div className="flex items-start justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon size={15} />
        </span>
        <ArrowUpRight
          size={15}
          className="text-muted/50 transition-colors group-hover:text-accent"
        />
      </div>
      <h3 className="mt-3 text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 flex-1 text-[11.5px] leading-relaxed text-muted">
        {description}
      </p>
      <p className="mt-3 border-t border-line/80 pt-2.5 text-[11.5px] font-medium text-accent-deep">
        {stat}
      </p>
    </Link>
  );
}
