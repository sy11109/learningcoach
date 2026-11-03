import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type {
  AssessmentQuestion,
  StageAssessment,
  StageResult,
} from "@/lib/types";
import { nowIso, parseJson } from "@/lib/utils";
import { touchProject, updateProject } from "@/lib/repos/projects";

interface AssessmentRow {
  id: string;
  project_id: string;
  questions: string;
  answers: string | null;
  result: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function mapAssessment(row: AssessmentRow): StageAssessment {
  return {
    id: row.id,
    projectId: row.project_id,
    questions: parseJson<AssessmentQuestion[]>(row.questions, []),
    answers: parseJson<Record<string, string> | null>(row.answers, null),
    result: parseJson<StageResult | null>(row.result, null),
    status: row.status as StageAssessment["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function createAssessment(
  projectId: string,
  questions: AssessmentQuestion[],
): StageAssessment {
  const db = getDb();
  const id = crypto.randomUUID();
  const at = nowIso();
  db.prepare(
    `INSERT INTO stage_assessments
      (id, project_id, questions, answers, result, status, created_at, updated_at)
     VALUES (?, ?, ?, NULL, NULL, 'draft', ?, ?)`,
  ).run(id, projectId, JSON.stringify(questions), at, at);
  touchProject(projectId);
  return getAssessmentOrThrow(id);
}

export function getAssessment(id: string): StageAssessment | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM stage_assessments WHERE id = ?")
    .get(id) as AssessmentRow | undefined;
  return row ? mapAssessment(row) : null;
}

export function getAssessmentOrThrow(id: string): StageAssessment {
  const assessment = getAssessment(id);
  if (!assessment) {
    throw new AppError("NOT_FOUND", "阶段测评不存在。");
  }
  return assessment;
}

export function getLatestAssessment(projectId: string): StageAssessment | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM stage_assessments WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(projectId) as AssessmentRow | undefined;
  return row ? mapAssessment(row) : null;
}

export function saveAnswers(
  id: string,
  answers: Record<string, string>,
): StageAssessment {
  const db = getDb();
  db.prepare(
    "UPDATE stage_assessments SET answers = ?, status = 'submitted', updated_at = ? WHERE id = ?",
  ).run(JSON.stringify(answers), nowIso(), id);
  return getAssessmentOrThrow(id);
}

export function scoreAssessment(
  id: string,
  result: StageResult,
): StageAssessment {
  const db = getDb();
  const assessment = getAssessmentOrThrow(id);
  const at = nowIso();
  db.prepare(
    "UPDATE stage_assessments SET result = ?, status = 'scored', completed_at = ?, updated_at = ? WHERE id = ?",
  ).run(JSON.stringify(result), at, at, id);
  updateProject(assessment.projectId, { currentStage: result.stage });
  return getAssessmentOrThrow(id);
}
