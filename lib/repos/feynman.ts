import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type {
  FeynmanKind,
  FeynmanMessage,
  FeynmanRole,
  FeynmanSession,
  FeynmanSessionDetail,
} from "@/lib/types";
import { nowIso, parseJson } from "@/lib/utils";
import { touchProject } from "@/lib/repos/projects";

interface SessionRow {
  id: string;
  project_id: string;
  concept: string;
  status: string;
  rounds: number;
  mastery: number | null;
  model: string | null;
  created_at: string;
  updated_at: string;
  passed_at: string | null;
}

interface MessageRow {
  id: string;
  session_id: string;
  round: number;
  role: string;
  kind: string;
  content: string;
  meta: string | null;
  created_at: string;
}

function mapSession(row: SessionRow): FeynmanSession {
  return {
    id: row.id,
    projectId: row.project_id,
    concept: row.concept,
    status: row.status as FeynmanSession["status"],
    rounds: row.rounds,
    mastery: row.mastery,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    passedAt: row.passed_at,
  };
}

function mapMessage(row: MessageRow): FeynmanMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    round: row.round,
    role: row.role as FeynmanRole,
    kind: row.kind as FeynmanKind,
    content: row.content,
    meta: parseJson<Record<string, unknown> | null>(row.meta, null),
    createdAt: row.created_at,
  };
}

export function createFeynmanSession(
  projectId: string,
  concept: string,
  model: string,
): FeynmanSession {
  const db = getDb();
  const id = crypto.randomUUID();
  const at = nowIso();
  db.prepare(
    `INSERT INTO feynman_sessions
      (id, project_id, concept, status, rounds, mastery, model, created_at, updated_at)
     VALUES (?, ?, ?, 'active', 0, NULL, ?, ?, ?)`,
  ).run(id, projectId, concept, model, at, at);
  touchProject(projectId);
  return getFeynmanSessionOrThrow(id);
}

export function getFeynmanSession(id: string): FeynmanSession | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM feynman_sessions WHERE id = ?")
    .get(id) as SessionRow | undefined;
  return row ? mapSession(row) : null;
}

export function getFeynmanSessionOrThrow(id: string): FeynmanSession {
  const session = getFeynmanSession(id);
  if (!session) {
    throw new AppError("NOT_FOUND", "费曼会话不存在。");
  }
  return session;
}

export function getFeynmanMessages(sessionId: string): FeynmanMessage[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM feynman_messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC",
    )
    .all(sessionId) as MessageRow[];
  return rows.map(mapMessage);
}

export function getFeynmanDetail(sessionId: string): FeynmanSessionDetail {
  const session = getFeynmanSessionOrThrow(sessionId);
  return { session, messages: getFeynmanMessages(sessionId) };
}

export function listFeynmanSessions(projectId: string): FeynmanSession[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM feynman_sessions WHERE project_id = ? ORDER BY created_at DESC",
    )
    .all(projectId) as SessionRow[];
  return rows.map(mapSession);
}

export function getLatestFeynman(projectId: string): FeynmanSessionDetail | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM feynman_sessions
       WHERE project_id = ?
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC
       LIMIT 1`,
    )
    .get(projectId) as SessionRow | undefined;
  if (!row) return null;
  return { session: mapSession(row), messages: getFeynmanMessages(row.id) };
}

export interface AddMessageInput {
  sessionId: string;
  round: number;
  role: FeynmanRole;
  kind: FeynmanKind;
  content: string;
  meta?: Record<string, unknown> | null;
}

export function addFeynmanMessage(input: AddMessageInput): FeynmanMessage {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO feynman_messages (id, session_id, round, role, kind, content, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.sessionId,
    input.round,
    input.role,
    input.kind,
    input.content,
    input.meta ? JSON.stringify(input.meta) : null,
    nowIso(),
  );
  const session = getFeynmanSessionOrThrow(input.sessionId);
  touchProject(session.projectId);
  const row = db
    .prepare("SELECT * FROM feynman_messages WHERE id = ?")
    .get(id) as MessageRow;
  return mapMessage(row);
}

export interface UpdateFeynmanProgressInput {
  rounds?: number;
  mastery?: number;
  passed?: boolean;
}

export function updateFeynmanProgress(
  sessionId: string,
  input: UpdateFeynmanProgressInput,
): FeynmanSession {
  const db = getDb();
  const session = getFeynmanSessionOrThrow(sessionId);
  const at = nowIso();
  const rounds = input.rounds ?? session.rounds;
  const mastery = input.mastery ?? session.mastery;
  const passed = input.passed ?? session.status === "passed";
  db.prepare(
    `UPDATE feynman_sessions
     SET rounds = ?, mastery = ?, status = ?, passed_at = COALESCE(passed_at, ?), updated_at = ?
     WHERE id = ?`,
  ).run(
    rounds,
    mastery,
    passed ? "passed" : "active",
    passed ? at : null,
    at,
    sessionId,
  );
  touchProject(session.projectId);
  return getFeynmanSessionOrThrow(sessionId);
}
