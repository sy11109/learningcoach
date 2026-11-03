import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function NextStepCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  href,
  cta,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-accent/20 bg-accent p-5 text-white shadow-[0_18px_40px_-30px_rgba(14,107,82,0.75)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] font-medium text-white/75">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-white/15">
            <Icon size={13} />
          </span>
          {eyebrow}
        </div>
        <h2 className="mt-3 text-[20px] font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-white/75">
          {description}
        </p>
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-accent-deep transition-transform hover:-translate-y-0.5"
        >
          {cta}
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
