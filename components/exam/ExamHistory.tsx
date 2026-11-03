"use client";

import { ChevronRight, History } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn, formatDate } from "@/lib/utils";
import type { ExamSession } from "@/lib/types";

export function ExamHistory({
  sessions,
  onOpen,
  loadingId,
}: {
  sessions: ExamSession[];
  onOpen: (id: string) => void;
  loadingId: string | null;
}) {
  return (
    <Card>
      <CardHeader
        icon={<History size={15} />}
        title="考试记录"
        description="点开任意一场，查看当时的逐题反馈与缺口报告。"
        action={
          sessions.length > 0 ? (
            <span className="tabular text-[11px] text-muted">
              {sessions.length} 场
            </span>
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <p className="px-5 py-8 text-center text-[12.5px] leading-relaxed text-muted">
          还没有考试记录。完成第一场考试后，这里会保存每一道题的评分与缺口报告。
        </p>
      ) : (
        <ul className="divide-y divide-line/80">
          {sessions.map((session) => {
            const active = session.status === "active";
            return (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onOpen(session.id)}
                  disabled={loadingId === session.id}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-paper/60 disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-ink">
                        {formatDate(session.createdAt)}
                      </span>
                      <Badge tone={active ? "amber" : "neutral"}>
                        {active ? "进行中" : "已结束"}
                      </Badge>
                      <Badge tone="outline">
                        {session.questionType === "short" ? "简答" : "单选"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      上限 {session.maxQuestions} 题
                      {session.model ? ` · ${session.model}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "tabular text-[15px] font-semibold",
                        session.avgScore !== null
                          ? session.avgScore >= 7
                            ? "text-accent"
                            : session.avgScore >= 5
                              ? "text-amber"
                              : "text-danger"
                          : "text-muted",
                      )}
                    >
                      {session.avgScore !== null
                        ? session.avgScore.toFixed(1)
                        : "—"}
                    </p>
                    <p className="text-[10px] text-muted">平均分</p>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-muted/60" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
