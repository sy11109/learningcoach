import { z } from "zod";
import { readJson } from "@/lib/api";
import { chatJson } from "@/lib/ai/client";
import {
  buildExamNextQuestionMessages,
  buildExamShortGradeMessages,
} from "@/lib/ai/prompts";
import {
  ExamNextQuestionSchema,
  ExamShortGradeSchema,
  ExamShortNextQuestionSchema,
} from "@/lib/ai/schemas";
import { AppError, errorResponse } from "@/lib/errors";
import { getProjectOrThrow } from "@/lib/repos/projects";
import { getLadder } from "@/lib/repos/ladder";
import {
  getExamDetail,
  getExamSessionOrThrow,
  recordAnswer,
} from "@/lib/repos/exam";
import type {
  ExamEvaluation,
  ExamQuestionType,
  ExamTurn,
} from "@/lib/types";
import { clamp, nowIso } from "@/lib/utils";

export const dynamic = "force-dynamic";

const AnswerSchema = z.object({
  expectedIdx: z.number().int().min(0).max(50),
  selected: z.number().int().min(0).max(3).optional(),
  answer: z.string().trim().min(2).max(4000).optional(),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await ctx.params;
    const input = await readJson(request, AnswerSchema);

    const session = getExamSessionOrThrow(sessionId);
    if (session.status === "finished") {
      throw new AppError("CONFLICT", "本场考试已经结束。");
    }

    const detail = getExamDetail(sessionId);
    const current = detail.turns.find((turn) => turn.idx === input.expectedIdx);
    if (!current) {
      throw new AppError("NOT_FOUND", "题目不存在，请刷新页面。");
    }
    if (current.answer !== null) {
      // Idempotent: a double submit must not score twice.
      return Response.json({ ...detail, duplicate: true });
    }

    const pending = detail.turns.filter((turn) => turn.answer === null);
    if (pending.length !== 1 || pending[0].id !== current.id) {
      throw new AppError("CONFLICT", "题目状态已变化，请刷新页面。");
    }

    // Use the session type, but fall back to the turn's shape for old rows.
    const looksLikeChoice =
      current.options.length === 4 && current.correct !== null;
    const questionType: ExamQuestionType =
      session.questionType === "short"
        ? "short"
        : looksLikeChoice
          ? "choice"
          : "short";

    const project = getProjectOrThrow(session.projectId);
    const ladder = getLadder(project.id);

    let answerText: string;
    let score: number;
    let evaluation: ExamEvaluation;
    let wentWell: boolean;

    if (questionType === "short") {
      if (!input.answer) {
        throw new AppError("VALIDATION", "请先用几句话写下你的答案。");
      }
      if (!current.reference) {
        throw new AppError(
          "CONFLICT",
          "这道题缺少参考答案，无法评分，请重新开始一场考试。",
        );
      }

      const output = await chatJson({
        messages: buildExamShortGradeMessages({
          project,
          ladder,
          question: current.question,
          reference: current.reference,
          answer: input.answer,
        }),
        schema: ExamShortGradeSchema,
        maxTokens: 1200,
        kind: "exam-short-grade",
        projectId: project.id,
        repairHint:
          '{"score":7,"correct":["……"],"missing":["……"],"wrong":[],"explanation":"……"}',
      });

      score = clamp(Math.round(output.score), 0, 10);
      answerText = input.answer;
      wentWell = score >= 7;
      evaluation = {
        score,
        correct: output.correct.slice(0, 8),
        missing: output.missing.slice(0, 8),
        wrong: output.wrong.slice(0, 8),
        explanation: output.explanation,
      };
    } else {
      if (input.selected === undefined) {
        throw new AppError("VALIDATION", "请选择一个选项。");
      }
      if (
        current.options.length !== 4 ||
        current.correct === null ||
        !current.options[current.correct]
      ) {
        throw new AppError(
          "CONFLICT",
          "这道题的数据不完整，请重新开始一场考试。",
        );
      }

      const chosenText = current.options[input.selected];
      if (!chosenText) {
        throw new AppError("VALIDATION", "选项不存在，请刷新页面。");
      }

      const isCorrect = input.selected === current.correct;
      score = isCorrect ? 10 : 0;
      answerText = chosenText;
      wentWell = isCorrect;
      evaluation = {
        score,
        correct: isCorrect ? [chosenText] : [],
        missing: isCorrect
          ? []
          : [current.explanation ?? "回到课程里补一下这个知识点。"],
        wrong: isCorrect ? [] : [chosenText],
        explanation: current.explanation ?? "",
      };
    }

    const answered = detail.turns.filter((turn) => turn.answer !== null);
    const answeredCount = answered.length + 1;
    const recentScores = [
      ...answered
        .map((turn) => turn.score)
        .filter((item): item is number => item !== null),
      score,
    ];
    const consecutiveLow =
      recentScores.length >= 2 &&
      recentScores.slice(-2).every((item) => item <= 3);
    const doneByLimit =
      answeredCount >= session.maxQuestions || consecutiveLow;

    const gradedCurrent: ExamTurn = {
      ...current,
      answer: answerText,
      score,
      feedback: evaluation,
      answeredAt: nowIso(),
    };
    const nextDifficulty = clamp(
      current.difficulty + (wentWell ? 1 : -1),
      1,
      5,
    );

    let next:
      | {
          question: string;
          options: string[];
          correct: number | null;
          explanation: string | null;
          reference: string | null;
          topic: string | null;
          difficulty: number;
        }
      | null = null;

    if (!doneByLimit) {
      const messages = buildExamNextQuestionMessages({
        project,
        ladder,
        session,
        answered: [...answered, gradedCurrent],
        nextDifficulty,
        questionType,
      });

      if (questionType === "short") {
        const output = await chatJson({
          messages,
          schema: ExamShortNextQuestionSchema,
          maxTokens: 1400,
          kind: "exam-next-question",
          projectId: project.id,
          repairHint: `{"question":"……？","reference":"评分要点：……","topic":"……","nextDifficulty":${nextDifficulty}}`,
        });
        next = {
          question: output.question,
          options: [],
          correct: null,
          explanation: null,
          reference: output.reference,
          topic: output.topic,
          difficulty: clamp(output.nextDifficulty, 1, 5),
        };
      } else {
        const output = await chatJson({
          messages,
          schema: ExamNextQuestionSchema,
          maxTokens: 1400,
          kind: "exam-next-question",
          projectId: project.id,
          repairHint: `{"question":"……？","options":["……","……","……","……"],"correct":0,"explanation":"……","topic":"……","nextDifficulty":${nextDifficulty}}`,
        });
        next = {
          question: output.question,
          options: output.options,
          correct: clamp(output.correct, 0, 3),
          explanation: output.explanation,
          reference: null,
          topic: output.topic,
          difficulty: clamp(output.nextDifficulty, 1, 5),
        };
      }
    }

    const updated = recordAnswer({
      sessionId,
      turnId: current.id,
      answer: answerText,
      evaluation,
      next,
    });

    return Response.json({
      ...updated,
      evaluation,
      done: next === null,
      duplicate: false,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
