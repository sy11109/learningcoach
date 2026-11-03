import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type {
  ExamEvaluation,
  ExamQuestionType,
  ExamReport,
  ExamSession,
  ExamSessionDetail,
  ExamTurn,
} from "@/lib/types";
import { nowIso, parseJson } from "@/lib/utils";
import { touchProject } from "@/lib/repos/projects";

interface SessionRow {
  id: string;
  project_id: string;
  status: string;
  question_type: string;
  max_questions: number;
  difficulty: number;
  avg_score: number | null;
  report: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

interface TurnRow {
  id: string;
  session_id: string;
  idx: number;
  question: string;
  options: string | null;
  correct: number | null;
  explanation: string | null;
  reference: string | null;
  topic: string | null;
  difficulty: number;
  answer: string | null;
  score: number | null;
  feedback: string | null;
  created_at: string;
  answered_at: string | null;
}

function mapSession(row: SessionRow): ExamSession {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status as ExamSession["status"],
    questionType: row.question_type === "short" ? "short" : "choice",
    maxQuestions: row.max_questions,
    difficulty: row.difficulty,
    avgScore: row.avg_score,
    report: parseJson<ExamReport | null>(row.report, null),
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
  };
}

function mapTurn(row: TurnRow): ExamTurn {
  return {
    id: row.id,
    sessionId: row.session_id,
    idx: row.idx,
    question: row.question,
    options: parseJson<string[]>(row.options, []),
    correct: row.correct,
    explanation: row.explanation,
    reference: row.reference,
    topic: row.topic,
    difficulty: row.difficulty,
    answer: row.answer,
    score: row.score,
    feedback: parseJson<ExamEvaluation | null>(row.feedback, null),
    createdAt: row.created_at,
    answeredAt: row.answered_at,
  };
}

export interface CreateExamInput {
  projectId: string;
  questionType: ExamQuestionType;
  maxQuestions: number;
  difficulty: number;
  model: string;
  firstQuestion: string;
  firstOptions: string[];
  firstCorrect: number | null;
  firstExplanation: string | null;
  firstReference: string | null;
  firstTopic: string | null;
  firstDifficulty: number;
}

export function createExamSession(input: CreateExamInput): ExamSessionDetail {
  const db = getDb();
  const id = crypto.randomUUID();
  const at = nowIso();
  const create = db.transaction(() => {
    db.prepare(
      `INSERT INTO exam_sessions
        (id, project_id, status, question_type, max_questions, difficulty, avg_score, report, model, created_at, updated_at)
       VALUES (?, ?, 'active', ?, ?, ?, NULL, NULL, ?, ?, ?)`,
    ).run(
      id,
      input.projectId,
      input.questionType,
      input.maxQuestions,
      input.difficulty,
      input.model,
      at,
      at,
    );
    db.prepare(
      `INSERT INTO exam_turns
        (id, session_id, idx, question, options, correct, explanation, reference, topic, difficulty, answer, score, feedback, created_at)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
    ).run(
      crypto.randomUUID(),
      id,
      input.firstQuestion,
      JSON.stringify(input.firstOptions),
      input.firstCorrect,
      input.firstExplanation,
      input.firstReference,
      input.firstTopic,
      input.firstDifficulty,
      at,
    );
    touchProject(input.projectId);
  });
  create();
  return getExamDetail(id);
}

export function getExamSession(id: string): ExamSession | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM exam_sessions WHERE id = ?")
    .get(id) as SessionRow | undefined;
  return row ? mapSession(row) : null;
}

export function getExamSessionOrThrow(id: string): ExamSession {
  const session = getExamSession(id);
  if (!session) {
    throw new AppError("NOT_FOUND", "考试场次不存在。");
  }
  return session;
}

export function getExamTurns(sessionId: string): ExamTurn[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM exam_turns WHERE session_id = ? ORDER BY idx ASC")
    .all(sessionId) as TurnRow[];
  return rows.map(mapTurn);
}

export function getExamDetail(sessionId: string): ExamSessionDetail {
  const session = getExamSessionOrThrow(sessionId);
  return { session, turns: getExamTurns(sessionId) };
}

export function listExamSessions(projectId: string): ExamSession[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM exam_sessions WHERE project_id = ? ORDER BY created_at DESC",
    )
    .all(projectId) as SessionRow[];
  return rows.map(mapSession);
}

export function getActiveExam(projectId: string): ExamSessionDetail | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM exam_sessions WHERE project_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    )
    .get(projectId) as SessionRow | undefined;
  if (!row) return null;
  return { session: mapSession(row), turns: getExamTurns(row.id) };
}

export function getTurn(sessionId: string, idx: number): ExamTurn | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM exam_turns WHERE session_id = ? AND idx = ?")
    .get(sessionId, idx) as TurnRow | undefined;
  return row ? mapTurn(row) : null;
}

export function countAnswered(sessionId: string): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) AS count FROM exam_turns WHERE session_id = ? AND answer IS NOT NULL",
    )
    .get(sessionId) as { count: number };
  return row.count;
}

export interface RecordAnswerInput {
  sessionId: string;
  turnId: string;
  answer: string;
  evaluation: ExamEvaluation;
  next: {
    question: string;
    options: string[];
    correct: number | null;
    explanation: string | null;
    reference: string | null;
    topic: string | null;
    difficulty: number;
  } | null;
}

export function recordAnswer(input: RecordAnswerInput): ExamSessionDetail {
  const db = getDb();
  const at = nowIso();
  const turn = db
    .prepare("SELECT * FROM exam_turns WHERE id = ? AND session_id = ?")
    .get(input.turnId, input.sessionId) as TurnRow | undefined;
  if (!turn) {
    throw new AppError("NOT_FOUND", "题目不存在。");
  }
  const session = getExamSessionOrThrow(input.sessionId);
  const write = db.transaction(() => {
    db.prepare(
      `UPDATE exam_turns
       SET answer = ?, score = ?, feedback = ?, answered_at = ?
       WHERE id = ?`,
    ).run(
      input.answer,
      input.evaluation.score,
      JSON.stringify(input.evaluation),
      at,
      input.turnId,
    );
    if (input.next) {
      db.prepare(
        `INSERT INTO exam_turns
          (id, session_id, idx, question, options, correct, explanation, reference, topic, difficulty, answer, score, feedback, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
      ).run(
        crypto.randomUUID(),
        input.sessionId,
        turn.idx + 1,
        input.next.question,
        JSON.stringify(input.next.options),
        input.next.correct,
        input.next.explanation,
        input.next.reference,
        input.next.topic,
        input.next.difficulty,
        at,
      );
    }
    db.prepare(
      "UPDATE exam_sessions SET difficulty = ?, updated_at = ? WHERE id = ?",
    ).run(
      input.next?.difficulty ?? session.difficulty,
      at,
      input.sessionId,
    );
    touchProject(session.projectId);
  });
  write();
  return getExamDetail(input.sessionId);
}

export function finishExamSession(
  sessionId: string,
  report: ExamReport,
  avgScore: number,
): ExamSession {
  const db = getDb();
  const session = getExamSessionOrThrow(sessionId);
  const at = nowIso();
  db.prepare(
    `UPDATE exam_sessions
     SET status = 'finished', report = ?, avg_score = ?, finished_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(JSON.stringify(report), avgScore, at, at, sessionId);
  touchProject(session.projectId);
  return getExamSessionOrThrow(sessionId);
}
