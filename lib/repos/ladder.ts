import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { LadderLevel, Stage } from "@/lib/types";
import { nowIso, parseJson } from "@/lib/utils";
import { touchProject } from "@/lib/repos/projects";

interface LadderRow {
  id: string;
  project_id: string;
  stage: number;
  title: string;
  summary: string;
  must_master: string;
  common_mistakes: string;
  gate_criteria: string;
  practice: string;
  estimated_sessions: number | null;
  estimated_hours: number | null;
  estimated_weeks: number | null;
  updated_at: string;
}

function mapLevel(row: LadderRow): LadderLevel {
  return {
    id: row.id,
    projectId: row.project_id,
    stage: row.stage as Stage,
    title: row.title,
    summary: row.summary,
    mustMaster: parseJson<string[]>(row.must_master, []),
    commonMistakes: parseJson<string[]>(row.common_mistakes, []),
    gateCriteria: row.gate_criteria,
    practice: row.practice,
    estimatedSessions: row.estimated_sessions,
    estimatedHours: row.estimated_hours,
    estimatedWeeks: row.estimated_weeks,
    updatedAt: row.updated_at,
  };
}

export function getLadder(projectId: string): LadderLevel[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM ladder_levels WHERE project_id = ? ORDER BY stage ASC")
    .all(projectId) as LadderRow[];
  return rows.map(mapLevel);
}

export interface GeneratedLevel {
  stage: Stage;
  title: string;
  summary: string;
  mustMaster: string[];
  commonMistakes: string[];
  gateCriteria: string;
  practice: string;
  estimatedSessions?: number | null;
  estimatedHours?: number | null;
  estimatedWeeks?: number | null;
}

export function replaceLadder(
  projectId: string,
  levels: GeneratedLevel[],
): LadderLevel[] {
  const db = getDb();
  const at = nowIso();
  const insert = db.prepare(
    `INSERT INTO ladder_levels
      (id, project_id, stage, title, summary, must_master, common_mistakes, gate_criteria, practice, estimated_sessions, estimated_hours, estimated_weeks, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const replace = db.transaction(() => {
    db.prepare("DELETE FROM ladder_levels WHERE project_id = ?").run(projectId);
    for (const level of levels) {
      insert.run(
        crypto.randomUUID(),
        projectId,
        level.stage,
        level.title,
        level.summary,
        JSON.stringify(level.mustMaster),
        JSON.stringify(level.commonMistakes),
        level.gateCriteria,
        level.practice,
        level.estimatedSessions ?? null,
        level.estimatedHours ?? null,
        level.estimatedWeeks ?? null,
        at,
      );
    }
    touchProject(projectId);
  });
  replace();
  return getLadder(projectId);
}

export interface UpdateLevelInput {
  title?: string;
  summary?: string;
  mustMaster?: string[];
  commonMistakes?: string[];
  gateCriteria?: string;
  practice?: string;
  estimatedSessions?: number | null;
  estimatedHours?: number | null;
  estimatedWeeks?: number | null;
}

export function updateLevel(
  projectId: string,
  levelId: string,
  patch: UpdateLevelInput,
): LadderLevel {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM ladder_levels WHERE id = ? AND project_id = ?")
    .get(levelId, projectId) as LadderRow | undefined;
  if (!row) {
    throw new AppError("NOT_FOUND", "阶梯层级不存在。");
  }
  const current = mapLevel(row);
  db.prepare(
    `UPDATE ladder_levels
     SET title = ?, summary = ?, must_master = ?, common_mistakes = ?, gate_criteria = ?, practice = ?,
         estimated_sessions = ?, estimated_hours = ?, estimated_weeks = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    patch.title ?? current.title,
    patch.summary ?? current.summary,
    JSON.stringify(patch.mustMaster ?? current.mustMaster),
    JSON.stringify(patch.commonMistakes ?? current.commonMistakes),
    patch.gateCriteria ?? current.gateCriteria,
    patch.practice ?? current.practice,
    patch.estimatedSessions !== undefined
      ? patch.estimatedSessions
      : current.estimatedSessions,
    patch.estimatedHours !== undefined
      ? patch.estimatedHours
      : current.estimatedHours,
    patch.estimatedWeeks !== undefined
      ? patch.estimatedWeeks
      : current.estimatedWeeks,
    nowIso(),
    levelId,
  );
  touchProject(projectId);
  const updated = db
    .prepare("SELECT * FROM ladder_levels WHERE id = ?")
    .get(levelId) as LadderRow;
  return mapLevel(updated);
}

export function getLevel(projectId: string, levelId: string): LadderLevel | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM ladder_levels WHERE id = ? AND project_id = ?")
    .get(levelId, projectId) as LadderRow | undefined;
  return row ? mapLevel(row) : null;
}
