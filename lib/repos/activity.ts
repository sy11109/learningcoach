import { getDb } from "@/lib/db";
import type {
  ActivityItem,
  ExamReport,
  LessonMode,
  LessonPlan,
  StageResult,
} from "@/lib/types";
import { LESSON_MODE_META, STAGE_META } from "@/lib/types";
import { parseJson } from "@/lib/utils";

export function getRecentActivity(
  projectId: string,
  limit = 8,
): ActivityItem[] {
  const db = getDb();

  const assessments = db
    .prepare(
      `SELECT id, result, completed_at FROM stage_assessments
       WHERE project_id = ? AND status = 'scored' AND completed_at IS NOT NULL`,
    )
    .all(projectId) as Array<{
    id: string;
    result: string | null;
    completed_at: string;
  }>;

  const lessons = db
    .prepare(
      `SELECT id, stage, mode, title, plan, completed, updated_at
       FROM stage_lessons WHERE project_id = ?`,
    )
    .all(projectId) as Array<{
    id: string;
    stage: number;
    mode: string | null;
    title: string;
    plan: string;
    completed: string;
    updated_at: string;
  }>;

  const exams = db
    .prepare(
      `SELECT id, avg_score, report, finished_at FROM exam_sessions
       WHERE project_id = ? AND status = 'finished' AND finished_at IS NOT NULL`,
    )
    .all(projectId) as Array<{
    id: string;
    avg_score: number | null;
    report: string | null;
    finished_at: string;
  }>;

  const feynmans = db
    .prepare(
      `SELECT id, concept, status, rounds, updated_at FROM feynman_sessions
       WHERE project_id = ?`,
    )
    .all(projectId) as Array<{
    id: string;
    concept: string;
    status: string;
    rounds: number;
    updated_at: string;
  }>;

  const items: ActivityItem[] = [];

  for (const row of assessments) {
    const result = parseJson<StageResult | null>(row.result, null);
    items.push({
      kind: "assessment",
      id: row.id,
      title: result
        ? `阶段定位 · ${STAGE_META[result.stage].name}`
        : "阶段定位",
      detail: result?.evidence?.[0] ?? "完成了一次阶段定位。",
      at: row.completed_at,
    });
  }

  for (const row of lessons) {
    const plan = parseJson<LessonPlan | null>(row.plan, null);
    const completed = parseJson<number[]>(row.completed, []).length;
    const total = plan?.sections.length ?? 0;
    const mode = (row.mode as LessonMode | null) ?? "standard";
    items.push({
      kind: "lesson",
      id: row.id,
      title: `学习内容 · 第 ${row.stage} 阶 · ${LESSON_MODE_META[mode].short}`,
      detail: plan
        ? `${plan.title} · 已学 ${completed}/${total} 节`
        : "学习内容已生成。",
      at: row.updated_at,
    });
  }

  for (const row of exams) {
    const report = parseJson<ExamReport | null>(row.report, null);
    items.push({
      kind: "exam",
      id: row.id,
      title: `AI 考官 · ${row.avg_score?.toFixed(1) ?? "—"} 分`,
      detail: report?.nextFocus || "完成了一场考试。",
      at: row.finished_at,
    });
  }

  for (const row of feynmans) {
    items.push({
      kind: "feynman",
      id: row.id,
      title: `费曼 · ${row.concept}`,
      detail:
        row.status === "passed"
          ? "已通过复述检验。"
          : row.rounds > 0
            ? `进行中，已讲 ${row.rounds} 轮。`
            : "刚创建，等待讲解。",
      at: row.updated_at,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
