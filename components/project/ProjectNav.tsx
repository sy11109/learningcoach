"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookX,
  ClipboardCheck,
  LayoutDashboard,
  Layers,
  MessageSquareQuote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { segment: "", label: "看板", icon: LayoutDashboard },
  { segment: "/ladder", label: "学习阶梯", icon: Layers },
  { segment: "/learn", label: "学习内容", icon: BookOpen },
  { segment: "/exam", label: "AI 考官", icon: ClipboardCheck },
  { segment: "/review", label: "错题回顾", icon: BookX },
  { segment: "/feynman", label: "费曼反馈", icon: MessageSquareQuote },
];

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/project/${projectId}`;

  return (
    <nav
      aria-label="项目导航"
      className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-paper-deep/50 p-1 lg:flex-col lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0"
    >
      {ITEMS.map((item) => {
        const href = `${base}${item.segment}`;
        const active =
          item.segment === ""
            ? pathname === base
            : pathname.startsWith(`${base}${item.segment}`);
        const Icon = item.icon;
        return (
          <Link
            key={item.segment}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors lg:w-full",
              active
                ? "bg-surface text-ink shadow-sm lg:border lg:border-accent/15 lg:bg-accent-soft lg:text-accent-deep lg:shadow-none"
                : "text-muted hover:bg-surface/70 hover:text-ink",
            )}
          >
            <Icon
              size={15}
              className={active ? "text-accent" : "text-muted/80"}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
