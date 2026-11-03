import { z } from "zod";

export const LadderSchema = z.object({
  levels: z
    .array(
      z.object({
        stage: z.number().int().min(1).max(5),
        title: z.string().min(1).max(80),
        summary: z.string().max(200).default(""),
        mustMaster: z.array(z.string().min(1)).min(2).max(8),
        commonMistakes: z.array(z.string().min(1)).min(1).max(8),
        gateCriteria: z.string().min(1).max(500),
        practice: z.string().max(500).default(""),
        estimatedSessions: z.number().int().min(0).max(40),
        estimatedHours: z.number().min(0).max(500),
        estimatedWeeks: z.number().min(0).max(52),
      }),
    )
    .length(5),
});

export type LadderOutput = z.infer<typeof LadderSchema>;

const REQUIRED_SECTION_KINDS = [
  "concept",
  "example",
  "practice",
  "pitfall",
] as const;

export const LessonPlanSchema = z
  .object({
    title: z.string().min(1).max(100),
    overview: z.string().min(20).max(700),
    throughline: z.string().min(20).max(500),
    totalMinutes: z.number().int().min(20).max(600),
    keyPoints: z.array(z.string().min(1).max(220)).min(3).max(5),
    sections: z
      .array(
        z.object({
          title: z.string().min(1).max(100),
          kind: z.enum([
            "concept",
            "example",
            "practice",
            "pitfall",
            "summary",
          ]),
          minutes: z.number().int().min(3).max(120),
          bridge: z.string().min(1).max(300),
          takeaway: z.string().min(1).max(300),
          content: z.string().min(60).max(1600),
          keyPoints: z
            .array(z.string().min(1).max(220))
            .min(1)
            .max(3),
          example: z
            .object({
              title: z.string().min(1).max(100),
              language: z.string().min(1).max(24),
              content: z.string().min(1).max(2000),
            })
            .nullish(),
          practice: z.string().min(1).max(600),
          checkpoint: z.string().min(1).max(400),
        }),
      )
      .length(5),
    nextStep: z.string().min(1).max(500),
  })
  .refine(
    (plan) => {
      const kinds = plan.sections.map((section) => section.kind);
      return REQUIRED_SECTION_KINDS.every((kind) => kinds.includes(kind));
    },
    {
      message:
        "sections 必须包含 concept、example、practice、pitfall 各至少一节",
      path: ["sections"],
    },
  )
  .refine(
    (plan) =>
      plan.sections[plan.sections.length - 1]?.kind === "summary",
    { message: "最后一节必须是 summary", path: ["sections"] },
  );

export type LessonPlanOutput = z.infer<typeof LessonPlanSchema>;

export const AssessmentQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1).max(300),
        hint: z.string().max(300).default(""),
        options: z.array(z.string().min(1).max(200)).length(4),
      }),
    )
    .length(5),
});

export type AssessmentQuestionsOutput = z.infer<
  typeof AssessmentQuestionsSchema
>;

export const StageResultSchema = z.object({
  stage: z.number().int().min(1).max(5),
  evidence: z.array(z.string().min(1)).min(1).max(6),
  nextStep: z.string().min(1).max(400),
});

export type StageResultOutput = z.infer<typeof StageResultSchema>;

export const ExamStartSchema = z.object({
  question: z.string().min(1).max(400),
  options: z.array(z.string().min(1).max(180)).length(4),
  correct: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(800),
  topic: z.string().min(1).max(120),
  difficulty: z.number().int().min(1).max(5),
});

export type ExamStartOutput = z.infer<typeof ExamStartSchema>;

export const ExamNextQuestionSchema = z.object({
  question: z.string().min(1).max(400),
  options: z.array(z.string().min(1).max(180)).length(4),
  correct: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(800),
  topic: z.string().min(1).max(120),
  nextDifficulty: z.number().int().min(1).max(5).default(2),
});

export type ExamNextQuestionOutput = z.infer<
  typeof ExamNextQuestionSchema
>;

export const ExamShortStartSchema = z.object({
  question: z.string().min(1).max(400),
  reference: z.string().min(1).max(1200),
  topic: z.string().min(1).max(120),
  difficulty: z.number().int().min(1).max(5),
});

export type ExamShortStartOutput = z.infer<typeof ExamShortStartSchema>;

export const ExamShortNextQuestionSchema = z.object({
  question: z.string().min(1).max(400),
  reference: z.string().min(1).max(1200),
  topic: z.string().min(1).max(120),
  nextDifficulty: z.number().int().min(1).max(5).default(2),
});

export type ExamShortNextQuestionOutput = z.infer<
  typeof ExamShortNextQuestionSchema
>;

export const ExamShortGradeSchema = z.object({
  score: z.number().int().min(0).max(10),
  correct: z.array(z.string()).max(8).default([]),
  missing: z.array(z.string()).max(8).default([]),
  wrong: z.array(z.string()).max(8).default([]),
  explanation: z.string().max(800).default(""),
});

export type ExamShortGradeOutput = z.infer<typeof ExamShortGradeSchema>;

export const ExamReportSchema = z.object({
  overallScore: z.number().min(0).max(10),
  strengths: z.array(z.string()).max(8).default([]),
  gaps: z
    .array(
      z.object({
        topic: z.string().min(1).max(120),
        why: z.string().min(1).max(400),
        severity: z.enum(["high", "medium", "low"]).default("medium"),
      }),
    )
    .max(10)
    .default([]),
  reviewPlan: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        action: z.string().min(1).max(400),
        minutes: z.number().int().min(5).max(240).default(30),
      }),
    )
    .max(8)
    .default([]),
  nextFocus: z.string().max(500).default(""),
});

export type ExamReportOutput = z.infer<typeof ExamReportSchema>;

export const FeynmanCritiqueSchema = z.object({
  correct: z.array(z.string()).max(8).default([]),
  missing: z.array(z.string()).max(8).default([]),
  confused: z.array(z.string()).max(8).default([]),
  jargon: z.array(z.string()).max(8).default([]),
  clarity: z.number().min(0).max(10),
  mastery: z.number().min(0).max(100),
  passed: z.boolean(),
  feedback: z.string().max(800).default(""),
  followUpQuestion: z.string().max(300).default(""),
});

export type FeynmanCritiqueOutput = z.infer<typeof FeynmanCritiqueSchema>;

export const FeynmanQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1).max(400),
        hint: z.string().max(300).default(""),
        answer: z.string().min(1).max(1200),
        source: z.string().min(1).max(160),
      }),
    )
    .min(3)
    .max(5),
});

export type FeynmanQuestionsOutput = z.infer<
  typeof FeynmanQuestionsSchema
>;
