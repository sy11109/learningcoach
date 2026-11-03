import { getDb } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import type {
  ExamEvaluation,
  ExamQuestionType,
} from "@/lib/types";

interface ReviewRow {
  id: string;
  project_id: string;
  session_question_type: string;
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
  answered_at: string | null;
  created_at: string;
}

export interface ReviewMistake {
  id: string;
  question: string;
  options: string[];
  correct: number | null;
  reference: string | null;
  topic: string | null;
  answer: string;
  score: number;
  explanation: string | null;
  difficulty: number;
  questionType: ExamQuestionType;
  answeredAt: string | null;
}

export interface ReviewTopicGroup {
  /** 归一化后的分组键 */
  key: string;
  /** 展示用的知识点名称 */
  topic: string;
  totalCount: number;
  wrongCount: number;
  errorRate: number;
  avgScore: number | null;
  lastWrongAt: string | null;
  /** 反复出错：同一个知识点错了 2 次及以上 */
  repeated: boolean;
  recentMistakes: ReviewMistake[];
}

export interface ReviewOverview {
  totalAnswered: number;
  totalWrong: number;
  totalTopics: number;
  repeatedTopicCount: number;
  occasionalTopicCount: number;
}

export interface ReviewData {
  overview: ReviewOverview;
  groups: ReviewTopicGroup[];
}

const UNTAGGED = "未标注知识点";

function normalizeTopic(topic: string | null): string {
  return (topic?.trim() || UNTAGGED).toLowerCase();
}

function displayTopic(topic: string | null): string {
  return topic?.trim() || UNTAGGED;
}

function isWrong(row: ReviewRow, questionType: ExamQuestionType): boolean {
  if (row.score === null) return false;
  return questionType === "short" ? row.score < 7 : row.score === 0;
}

export function getReviewData(projectId: string): ReviewData {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.id, t.question, t.options, t.correct, t.explanation,
              t.reference, t.topic, t.difficulty, t.answer, t.score,
              t.feedback, t.answered_at, t.created_at,
              s.project_id, s.question_type AS session_question_type
       FROM exam_turns t
       JOIN exam_sessions s ON s.id = t.session_id
       WHERE s.project_id = ? AND t.answer IS NOT NULL
       ORDER BY COALESCE(t.answered_at, t.created_at) DESC`,
    )
    .all(projectId) as ReviewRow[];

  const buckets = new Map<
    string,
    {
      topic: string;
      totalCount: number;
      scores: number[];
      mistakes: ReviewMistake[];
    }
  >();

  for (const row of rows) {
    const options = parseJson<string[]>(row.options, []);
    const questionType: ExamQuestionType =
      row.session_question_type === "short"
        ? "short"
        : options.length === 4 && row.correct !== null
          ? "choice"
          : "short";
    const key = normalizeTopic(row.topic);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        topic: displayTopic(row.topic),
        totalCount: 0,
        scores: [],
        mistakes: [],
      };
      buckets.set(key, bucket);
    }
    bucket.totalCount += 1;
    if (row.score !== null) bucket.scores.push(row.score);
    if (!isWrong(row, questionType)) continue;

    const feedback = parseJson<ExamEvaluation | null>(row.feedback, null);
    bucket.mistakes.push({
      id: row.id,
      question: row.question,
      options,
      correct: row.correct,
      reference: row.reference,
      topic: row.topic,
      answer: row.answer ?? "",
      score: row.score ?? 0,
      explanation: feedback?.explanation || row.explanation || null,
      difficulty: row.difficulty,
      questionType,
      answeredAt: row.answered_at ?? row.created_at,
    });
  }

  const groups: ReviewTopicGroup[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.mistakes.length === 0) continue;
    const mistakes = bucket.mistakes
      .sort((a, b) =>
        (b.answeredAt ?? "").localeCompare(a.answeredAt ?? ""),
      )
      .slice(0, 3);
    const avgScore =
      bucket.scores.length > 0
        ? Math.round(
            (bucket.scores.reduce((sum, score) => sum + score, 0) /
              bucket.scores.length) *
              10,
          ) / 10
        : null;

    groups.push({
      key,
      topic: bucket.topic,
      totalCount: bucket.totalCount,
      wrongCount: bucket.mistakes.length,
      errorRate: Math.round((bucket.mistakes.length / bucket.totalCount) * 100),
      avgScore,
      lastWrongAt: mistakes[0]?.answeredAt ?? null,
      repeated: bucket.mistakes.length >= 2,
      recentMistakes: mistakes,
    });
  }

  groups.sort((a, b) => {
    if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
    return (b.lastWrongAt ?? "").localeCompare(a.lastWrongAt ?? "");
  });

  const overview: ReviewOverview = {
    totalAnswered: rows.length,
    totalWrong: groups.reduce((sum, group) => sum + group.wrongCount, 0),
    totalTopics: groups.length,
    repeatedTopicCount: groups.filter((group) => group.repeated).length,
    occasionalTopicCount: groups.filter((group) => !group.repeated).length,
  };

  return { overview, groups };
}
