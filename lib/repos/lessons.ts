import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type {
  LessonMode,
  LessonPlan,
  LessonSummary,
  Stage,
  StageLesson,
} from "@/lib/types";
import { nowIso, parseJson } from "@/lib/utils";
import { touchProject } from "@/lib/repos/projects";

interface LessonRow {
  id: string;
  project_id: string;
  stage: number;
  mode: string | null;
  title: string;
  plan: string;
  completed: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

function mapLesson(row: LessonRow): StageLesson {
  const plan = parseJson<LessonPlan>(row.plan, {
    title: row.title,
    overview: "",
    totalMinutes: 0,
    keyPoints: [],
    sections: [],
    nextStep: "",
  });
  const completed = [
    ...new Set(
      parseJson<number[]>(row.completed, []).filter(
        (index) => Number.isInteger(index) && index >= 0,
      ),
    ),
  ]
    .filter((index) => index < (plan.sections?.length ?? 0))
    .sort((a, b) => a - b);

  return {
    id: row.id,
    projectId: row.project_id,
    stage: row.stage as Stage,
    mode: (row.mode as LessonMode | null) ?? "standard",
    title: row.title,
    plan,
    completed,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSummary(lesson: StageLesson): LessonSummary {
  return {
    id: lesson.id,
    projectId: lesson.projectId,
    stage: lesson.stage,
    mode: lesson.mode,
    title: lesson.title,
    sectionCount: lesson.plan.sections.length,
    completedCount: lesson.completed.length,
    updatedAt: lesson.updatedAt,
  };
}

export function getLesson(
  projectId: string,
  stage: Stage,
  mode: LessonMode,
): StageLesson | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM stage_lessons
       WHERE project_id = ? AND stage = ? AND mode = ?`,
    )
    .get(projectId, stage, mode) as LessonRow | undefined;
  return row ? mapLesson(row) : null;
}

export function getLessonOrThrow(
  projectId: string,
  stage: Stage,
  mode: LessonMode,
): StageLesson {
  const lesson = getLesson(projectId, stage, mode);
  if (!lesson) {
    throw new AppError("NOT_FOUND", "这一阶段还没有生成这种模式的学习内容。");
  }
  return lesson;
}

export function listLessons(projectId: string): StageLesson[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM stage_lessons WHERE project_id = ?
       ORDER BY stage ASC, updated_at DESC`,
    )
    .all(projectId) as LessonRow[];
  return rows.map(mapLesson);
}

export function listLessonSummaries(projectId: string): LessonSummary[] {
  return listLessons(projectId).map(mapSummary);
}

export function saveLesson(
  projectId: string,
  stage: Stage,
  mode: LessonMode,
  plan: LessonPlan,
  model: string | null,
): StageLesson {
  const db = getDb();
  const at = nowIso();
  db.prepare(
    `INSERT INTO stage_lessons
      (id, project_id, stage, mode, title, plan, completed, model, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)
     ON CONFLICT(project_id, stage, mode) DO UPDATE SET
       title = excluded.title,
       plan = excluded.plan,
       completed = '[]',
       model = excluded.model,
       updated_at = excluded.updated_at`,
  ).run(
    crypto.randomUUID(),
    projectId,
    stage,
    mode,
    plan.title,
    JSON.stringify(plan),
    model,
    at,
    at,
  );
  touchProject(projectId);
  return getLessonOrThrow(projectId, stage, mode);
}

export function setLessonProgress(
  projectId: string,
  stage: Stage,
  mode: LessonMode,
  completed: number[],
): StageLesson {
  const db = getDb();
  const lesson = getLessonOrThrow(projectId, stage, mode);
  const sectionCount = lesson.plan.sections.length;
  const clean = [...new Set(completed)]
    .filter(
      (index) =>
        Number.isInteger(index) && index >= 0 && index < sectionCount,
    )
    .sort((a, b) => a - b);

  db.prepare(
    `UPDATE stage_lessons SET completed = ?, updated_at = ?
     WHERE project_id = ? AND stage = ? AND mode = ?`,
  ).run(JSON.stringify(clean), nowIso(), projectId, stage, mode);
  touchProject(projectId);
  return getLessonOrThrow(projectId, stage, mode);
}
