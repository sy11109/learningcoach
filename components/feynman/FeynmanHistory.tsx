"use client";

import { ChevronRight, History } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { relativeTime } from "@/lib/utils";
import type { FeynmanSession } from "@/lib/types";

export function FeynmanHistory({
  sessions,
  onOpen,
  loadingId,
}: {
  sessions: FeynmanSession[];
  onOpen: (id: string) => void;
  loadingId: string | null;
}) {
  return (
    <Card>
      <CardHeader
        icon={<History size={15} />}
        title="讲过的概念"
        description="每一场都会保留完整对话和点评。"
        action={
          sessions.length > 0 ? (
            <span className="tabular text-[11px] text-muted">
              {sessions.length} 个
            </span>
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <p className="px-5 py-8 text-center text-[12.5px] leading-relaxed text-muted">
          还没有费曼记录。选一个概念，先让 AI 讲一遍，再试着讲回去。
        </p>
      ) : (
        <ul className="divide-y divide-line/80">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                onClick={() => onOpen(session.id)}
                disabled={loadingId === session.id}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-paper/60 disabled:opacity-60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">
                      {session.concept}
                    </span>
                    <Badge
                      tone={session.status === "passed" ? "accent" : "amber"}
                    >
                      {session.status === "passed" ? "已通过" : "进行中"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {session.rounds > 0
                      ? `已讲 ${session.rounds} 轮`
                      : "还没有开始讲解"}
                    {session.mastery !== null
                      ? ` · 掌握度 ${session.mastery}/100`
                      : ""}
                    {" · "}
                    {relativeTime(session.updatedAt)}
                  </p>
                </div>
                <ChevronRight size={15} className="shrink-0 text-muted/60" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
