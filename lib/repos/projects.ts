import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type {
  Project,
  ProjectPace,
  ProjectSummary,
  Stage,
} from "@/lib/types";
import { nowIso } from "@/lib/utils";

interface ProjectRow {
  id: string;
  topic: string;
  goal: string;
  background: string;
  weekly_hours: number;
  pace: string | null;
  current_stage: number | null;
  created_at: string;
  updated_at: string;
}

interface ProjectSummaryRow extends ProjectRow {
  ladder_count: number;
  lesson_count: number;
  assessment_count: number;
  exam_count: number;
  exam_avg: number | null;
  feynman_passed: number;
  feynman_active: number;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    topic: row.topic,
    goal: row.goal,
    background: row.background,
    weeklyHours: row.weekly_hours,
    pace: (row.pace as ProjectPace | null) ?? "standard",
    currentStage: (row.current_stage as Stage | null) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SUMMARY_COLUMNS = `p.*,
  (SELECT COUNT(*) FROM ladder_levels l WHERE l.project_id = p.id) AS ladder_count,
  (SELECT COUNT(DISTINCT sl.stage) FROM stage_lessons sl WHERE sl.project_id = p.id) AS lesson_count,
  (SELECT COUNT(*) FROM stage_assessments a WHERE a.project_id = p.id AND a.status = 'scored') AS assessment_count,
  (SELECT COUNT(*) FROM exam_sessions e WHERE e.project_id = p.id AND e.status = 'finished') AS exam_count,
  (SELECT AVG(e.avg_score) FROM exam_sessions e WHERE e.project_id = p.id AND e.status = 'finished' AND e.avg_score IS NOT NULL) AS exam_avg,
  (SELECT COUNT(*) FROM feynman_sessions f WHERE f.project_id = p.id AND f.status = 'passed') AS feynman_passed,
  (SELECT COUNT(*) FROM feynman_sessions f WHERE f.project_id = p.id AND f.status = 'active') AS feynman_active`;

function mapSummary(row: ProjectSummaryRow): ProjectSummary {
  return {
    ...mapProject(row),
    ladderCount: row.ladder_count,
    lessonCount: row.lesson_count,
    assessmentCount: row.assessment_count,
    examCount: row.exam_count,
    examAvg: row.exam_avg,
    feynmanPassed: row.feynman_passed,
    feynmanActive: row.feynman_active,
  };
}

export function listProjects(): ProjectSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS} FROM projects p ORDER BY p.updated_at DESC`,
    )
    .all() as ProjectSummaryRow[];

  return rows.map(mapSummary);
}

export function getProjectSummary(id: string): ProjectSummary | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT ${SUMMARY_COLUMNS} FROM projects p WHERE p.id = ?`)
    .get(id) as ProjectSummaryRow | undefined;
  return row ? mapSummary(row) : null;
}

export function getProject(id: string): Project | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as ProjectRow | undefined;
  return row ? mapProject(row) : null;
}

export function getProjectOrThrow(id: string): Project {
  const project = getProject(id);
  if (!project) {
    throw new AppError("NOT_FOUND", "学习项目不存在或已被删除。");
  }
  return project;
}

export interface CreateProjectInput {
  topic: string;
  goal?: string;
  background?: string;
  weeklyHours?: number;
  pace?: ProjectPace;
}

export function createProject(input: CreateProjectInput): Project {
  const db = getDb();
  const id = crypto.randomUUID();
  const at = nowIso();
  db.prepare(
    `INSERT INTO projects (id, topic, goal, background, weekly_hours, pace, current_stage, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
  ).run(
    id,
    input.topic.trim(),
    (input.goal ?? "").trim(),
    (input.background ?? "").trim(),
    input.weeklyHours ?? 5,
    input.pace ?? "standard",
    at,
    at,
  );
  return getProjectOrThrow(id);
}

export interface UpdateProjectInput {
  topic?: string;
  goal?: string;
  background?: string;
  weeklyHours?: number;
  pace?: ProjectPace;
  currentStage?: Stage | null;
}

export function updateProject(id: string, patch: UpdateProjectInput): Project {
  const project = getProjectOrThrow(id);
  const db = getDb();
  const next = {
    topic: patch.topic?.trim() || project.topic,
    goal: patch.goal?.trim() ?? project.goal,
    background: patch.background?.trim() ?? project.background,
    weeklyHours: patch.weeklyHours ?? project.weeklyHours,
    pace: patch.pace ?? project.pace,
    currentStage:
      patch.currentStage === undefined ? project.currentStage : patch.currentStage,
  };
  db.prepare(
    `UPDATE projects
     SET topic = ?, goal = ?, background = ?, weekly_hours = ?, pace = ?, current_stage = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    next.topic,
    next.goal,
    next.background,
    next.weeklyHours,
    next.pace,
    next.currentStage,
    nowIso(),
    id,
  );
  return getProjectOrThrow(id);
}

export function deleteProject(id: string) {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw new AppError("NOT_FOUND", "学习项目不存在或已被删除。");
  }
}

export function touchProject(id: string) {
  const db = getDb();
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(nowIso(), id);
}
