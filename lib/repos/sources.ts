import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { ProjectSource } from "@/lib/types";
import { nowIso } from "@/lib/utils";
import { touchProject } from "@/lib/repos/projects";

interface SourceRow {
  id: string;
  project_id: string;
  name: string;
  mime: string;
  text: string;
  char_count: number;
  created_at: string;
}

function mapSource(row: SourceRow): ProjectSource {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    mime: row.mime,
    charCount: row.char_count,
    createdAt: row.created_at,
  };
}

export function listSources(projectId: string): ProjectSource[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, project_id, name, mime, text, char_count, created_at
       FROM project_sources WHERE project_id = ? ORDER BY created_at ASC`,
    )
    .all(projectId) as SourceRow[];
  return rows.map(mapSource);
}

export function getSourceTexts(
  projectId: string,
): Array<{ name: string; text: string }> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT name, text FROM project_sources
       WHERE project_id = ? ORDER BY created_at ASC`,
    )
    .all(projectId) as Array<{ name: string; text: string }>;
  return rows;
}

export function addSource(input: {
  projectId: string;
  name: string;
  mime: string;
  text: string;
}): ProjectSource {
  const db = getDb();
  if (!input.text.trim()) {
    throw new AppError("VALIDATION", "这个文件里没有抽取到可用文字。");
  }
  const id = crypto.randomUUID();
  const at = nowIso();
  db.prepare(
    `INSERT INTO project_sources
      (id, project_id, name, mime, text, char_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.projectId,
    input.name,
    input.mime,
    input.text,
    input.text.length,
    at,
  );
  touchProject(input.projectId);
  const row = db
    .prepare("SELECT * FROM project_sources WHERE id = ?")
    .get(id) as SourceRow;
  return mapSource(row);
}

export function deleteSource(projectId: string, sourceId: string) {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM project_sources WHERE id = ? AND project_id = ?")
    .run(sourceId, projectId);
  if (result.changes === 0) {
    throw new AppError("NOT_FOUND", "这份资料不存在或已被删除。");
  }
  touchProject(projectId);
}
