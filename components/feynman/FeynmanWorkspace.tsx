"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Square,
  Trophy,
} from "lucide-react";
import { ConceptForm } from "@/components/feynman/ConceptForm";
import { FeynmanHistory } from "@/components/feynman/FeynmanHistory";
import { MessageBubble } from "@/components/feynman/FeynmanMessages";
import { RestateBox } from "@/components/feynman/RestateBox";
import { SelfCheckCard } from "@/components/feynman/SelfCheckCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { apiRequest, errorMessage, postJson } from "@/lib/client";
import { useTextStream } from "@/lib/hooks/useTextStream";
import { cn, formatDate } from "@/lib/utils";
import type {
  FeynmanMessage,
  FeynmanSession,
  FeynmanSessionDetail,
  SelfCheckSet,
} from "@/lib/types";

function sortSessions(sessions: FeynmanSession[]) {
  return [...sessions].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function FeynmanWorkspace({
  projectId,
  initialSessions,
  initialActive,
  initialConcept = "",
  initialSelfChecks = null,
}: {
  projectId: string;
  initialSessions: FeynmanSession[];
  initialActive: FeynmanSession | null;
  initialConcept?: string;
  initialSelfChecks?: SelfCheckSet | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const { text, streaming, run, stop, reset } = useTextStream();

  const [detail, setDetail] = useState<FeynmanSessionDetail | null>(null);
  const [sessions, setSessions] = useState(initialSessions);
  const [active, setActive] = useState(initialActive);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [restating, setRestating] = useState(false);

  function upsert(session: FeynmanSession) {
    setSessions((current) =>
      sortSessions([
        session,
        ...current.filter((item) => item.id !== session.id),
      ]),
    );
  }

  async function refreshDetail(id: string) {
    const fresh = await apiRequest<FeynmanSessionDetail>(
      `/api/feynman/${id}`,
    );
    setDetail(fresh);
    upsert(fresh.session);
    if (fresh.session.status !== "active") setActive(null);
    return fresh;
  }

  async function runExplanation(id: string, kind: "explain" | "retry") {
    reset();
    const result = await run(`/api/feynman/${id}/${kind}`);
    if (result.aborted) {
      // Give the server a moment to persist the partial text after the abort.
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    try {
      await refreshDetail(id);
    } catch {
      // The conversation is still usable from local state.
    }
    reset();
    router.refresh();

    if (result.aborted) {
      toast.push("已停止生成，已保存写出的部分。", "info");
    } else if (!result.ok) {
      toast.error(result.error ?? "讲解生成失败，请重试。");
    }
  }

  async function handleCreate(concept: string) {
    if (creating || streaming) return;
    setCreating(true);
    try {
      const res = await postJson<FeynmanSessionDetail>(
        `/api/projects/${projectId}/feynman`,
        { concept },
      );
      setDetail(res);
      setActive(null);
      upsert(res.session);
      router.refresh();
      await runExplanation(res.session.id, "explain");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function openSession(id: string) {
    if (streaming) return;
    setLoadingId(id);
    try {
      await refreshDetail(id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRetry() {
    if (!detail || streaming) return;
    await runExplanation(detail.session.id, "retry");
  }

  async function handleRestate(value: string): Promise<boolean> {
    if (!detail) return false;
    setRestating(true);
    try {
      await postJson(`/api/feynman/${detail.session.id}/restate`, {
        restatement: value,
      });
      const fresh = await refreshDetail(detail.session.id);
      router.refresh();
      if (fresh.session.status === "passed") {
        toast.success("讲清楚了，这个概念通过了。");
      } else {
        toast.push("还不够清楚，换一种讲法再试一次。", "info");
      }
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setRestating(false);
    }
  }

  function backToList() {
    if (streaming) return;
    if (detail?.session.status === "active") setActive(detail.session);
    setDetail(null);
    reset();
    router.refresh();
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">
            费曼反馈
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
            检验自己是否真的理解：先听 AI 用最简单的语言讲一遍，再不看讲解复述回去。讲不清，就是还没懂。
          </p>
        </div>

        {active ? (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/25 bg-accent-soft/50 px-5 py-4">
            <div>
              <p className="text-[11px] text-muted">有一场进行中的费曼</p>
              <p className="mt-0.5 text-[15px] font-semibold text-ink">
                {active.concept}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {active.rounds > 0
                  ? `已讲 ${active.rounds} 轮`
                  : "还没有开始讲解"}
                {active.mastery !== null
                  ? ` · 掌握度 ${active.mastery}/100`
                  : ""}
              </p>
            </div>
            <Button onClick={() => openSession(active.id)} loading={loadingId === active.id}>
              继续这一场
              <ArrowRight size={15} />
            </Button>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <ConceptForm
            onCreate={handleCreate}
            pending={creating}
            initialConcept={initialConcept}
          />
          <FeynmanHistory
            sessions={sessions}
            onOpen={openSession}
            loadingId={loadingId}
          />
        </div>

        <SelfCheckCard projectId={projectId} initial={initialSelfChecks} />

        <Card className="bg-paper/50 px-5 py-4">
          <p className="text-[11px] font-semibold text-muted">通过标准</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            核心概念正确 + 类比成立 + 没有重大混淆。如果你只是把术语换了个说法，却讲不出它为什么这样工作，AI 会把它标成「假懂」，也不会判定通过。
          </p>
        </Card>
      </div>
    );
  }

  const session = detail.session;
  const messages = detail.messages;
  const last: FeynmanMessage | undefined = messages[messages.length - 1];
  const awaitingRestate =
    last?.kind === "explain" || last?.kind === "retry-explain";
  const lastCritique =
    last?.kind === "feedback"
      ? (last.meta?.critique as { passed?: boolean } | undefined)
      : undefined;
  const passed = session.status === "passed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={backToList}
          disabled={streaming}
        >
          <ArrowLeft size={14} />
          返回
        </Button>
        <Badge tone={passed ? "accent" : "amber"}>
          {passed ? "已通过" : `第 ${session.rounds} 轮`}
        </Badge>
      </div>

      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-ink">
          {session.concept}
        </h2>
        <p className="mt-1 text-[11.5px] text-muted">
          发起于 {formatDate(session.createdAt)}
          {session.mastery !== null
            ? ` · 掌握度 ${session.mastery}/100`
            : ""}
          {session.rounds > 0 ? ` · 已讲 ${session.rounds} 轮` : ""}
        </p>
      </div>

      <SelfCheckCard projectId={projectId} initial={initialSelfChecks} />

      <Card className="p-4 sm:p-5">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {streaming ? (
            <div>
              <p className="mb-1 text-[10.5px] text-muted">AI 正在讲解…</p>
              <div className="rounded-2xl rounded-tl-md border border-accent/20 bg-accent-soft/30 px-4 py-3">
                <p
                  className={cn(
                    "whitespace-pre-wrap text-[13.5px] leading-[1.85] text-ink-soft",
                    "streaming-caret",
                  )}
                >
                  {text || "正在组织语言"}
                </p>
                <button
                  type="button"
                  onClick={stop}
                  className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-muted transition-colors hover:text-ink"
                >
                  <Square size={9} />
                  停止生成
                </button>
              </div>
            </div>
          ) : null}

          {!streaming && messages.length === 0 && !passed ? (
            <div className="flex flex-col items-center py-6 text-center">
              <p className="text-[13px] font-medium text-ink">
                这个会话还没有讲解
              </p>
              <p className="mt-1 text-[11.5px] text-muted">
                可能是上次生成中断了，可以重新开始。
              </p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => runExplanation(session.id, "explain")}
              >
                让 AI 讲一遍
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {!streaming && !passed && awaitingRestate ? (
        <RestateBox onSubmit={handleRestate} pending={restating} />
      ) : null}

      {!streaming && !passed && lastCritique?.passed === false ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber/25 bg-amber-soft/50 px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber" />
            <div>
              <p className="text-[13px] font-semibold text-ink">
                还不够清楚，换一种讲法
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                AI 会针对上一轮漏掉和混淆的点，换一个生活类比重新解释一遍。
              </p>
            </div>
          </div>
          <Button onClick={handleRetry}>
            换一种讲法
            <ArrowRight size={14} />
          </Button>
        </Card>
      ) : null}

      {passed ? (
        <Card className="border-accent/25 bg-accent-soft/50 px-5 py-6 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent text-white">
            <Trophy size={20} />
          </span>
          <p className="mt-3 text-[16px] font-semibold text-ink">
            「{session.concept}」你讲清楚了
          </p>
          <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-muted">
            用了 {session.rounds} 轮，掌握度 {session.mastery ?? "—"}
            /100。隔一天再用自己的话讲一次，巩固效果更好。
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={backToList}>
              学下一个概念
              <ArrowRight size={14} />
            </Button>
            <Button variant="secondary" onClick={backToList}>
              返回列表
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
