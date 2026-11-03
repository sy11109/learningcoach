import { getDb } from "@/lib/db";
import { nowIso, parseJson } from "@/lib/utils";
import type { SelfCheckQuestion, SelfCheckSet } from "@/lib/types";

interface SelfCheckRow {
  project_id: string;
  questions: string;
  meta: string | null;
  created_at: string;
  updated_at: string;
}

export function getSelfChecks(projectId: string): SelfCheckSet | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM project_self_checks WHERE project_id = ?")
    .get(projectId) as SelfCheckRow | undefined;
  if (!row) return null;
  return {
    questions: parseJson<SelfCheckQuestion[]>(row.questions, []),
    meta: parseJson<Record<string, unknown> | null>(row.meta, null),
    updatedAt: row.updated_at,
  };
}

export function saveSelfChecks(
  projectId: string,
  questions: SelfCheckQuestion[],
  meta: Record<string, unknown> | null,
): SelfCheckSet {
  const db = getDb();
  const at = nowIso();
  db.prepare(
    `INSERT INTO project_self_checks
      (project_id, questions, meta, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(project_id) DO UPDATE SET
       questions = excluded.questions,
       meta = excluded.meta,
       updated_at = excluded.updated_at`,
  ).run(
    projectId,
    JSON.stringify(questions),
    meta ? JSON.stringify(meta) : null,
    at,
    at,
  );
  const saved = getSelfChecks(projectId);
  if (!saved) {
    throw new Error("自测题保存失败。");
  }
  return saved;
}
