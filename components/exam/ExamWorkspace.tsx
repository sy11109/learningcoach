"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExamHistory } from "@/components/exam/ExamHistory";
import { ExamReport } from "@/components/exam/ExamReport";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { ExamSetup } from "@/components/exam/ExamSetup";
import { useToast } from "@/components/ui/Toast";
import { apiRequest, errorMessage } from "@/lib/client";
import type {
  ExamQuestionType,
  ExamSession,
  ExamSessionDetail,
} from "@/lib/types";

function sortSessions(sessions: ExamSession[]) {
  return [...sessions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function ExamWorkspace({
  projectId,
  initialActive,
  initialSessions,
  initialFocus = "",
  initialQuestionType = "choice",
  initialDifficulty = 1,
}: {
  projectId: string;
  initialActive: ExamSessionDetail | null;
  initialSessions: ExamSession[];
  initialFocus?: string;
  initialQuestionType?: ExamQuestionType;
  initialDifficulty?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [detail, setDetail] = useState<ExamSessionDetail | null>(initialActive);
  const [sessions, setSessions] = useState(initialSessions);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function upsertSession(session: ExamSession) {
    setSessions((current) =>
      sortSessions([session, ...current.filter((item) => item.id !== session.id)]),
    );
  }

  async function openSession(id: string) {
    if (detail?.session.id === id) return;
    setLoadingId(id);
    try {
      const res = await apiRequest<ExamSessionDetail>(`/api/exam/${id}`);
      setDetail(res);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoadingId(null);
    }
  }

  function handleStarted(next: ExamSessionDetail) {
    setDetail(next);
    upsertSession(next.session);
    router.refresh();
  }

  function handleFinished(next: ExamSessionDetail) {
    setDetail(next);
    upsertSession(next.session);
    router.refresh();
  }

  function handleRestart() {
    setDetail(null);
    router.refresh();
  }

  if (detail) {
    return detail.session.status === "active" ? (
      <ExamRunner initialDetail={detail} onFinished={handleFinished} />
    ) : (
      <ExamReport detail={detail} onRestart={handleRestart} />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:items-start">
      <ExamSetup
        projectId={projectId}
        onStarted={handleStarted}
        initialFocus={initialFocus}
        initialQuestionType={initialQuestionType}
        initialDifficulty={initialDifficulty}
      />
      <ExamHistory
        sessions={sessions}
        onOpen={openSession}
        loadingId={loadingId}
      />
    </div>
  );
}
