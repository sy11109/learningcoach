export type Stage = 1 | 2 | 3 | 4 | 5;

export const STAGE_META: Record<
  Stage,
  { name: string; short: string; tagline: string; color: string }
> = {
  1: { name: "阶段 1 · 入门", short: "入门", tagline: "能跑起来", color: "#B45309" },
  2: { name: "阶段 2 · 进阶", short: "进阶", tagline: "能做项目", color: "#0E6B52" },
  3: { name: "阶段 3 · 熟练", short: "熟练", tagline: "独立交付", color: "#1D4ED8" },
  4: { name: "阶段 4 · 精通", short: "精通", tagline: "能设计", color: "#6D28D9" },
  5: { name: "阶段 5 · 大神", short: "大神", tagline: "有影响力", color: "#9D174D" },
};

export type ProjectPace = "light" | "standard" | "deep";

export const PROJECT_PACE_META: Record<
  ProjectPace,
  { name: string; short: string; description: string }
> = {
  light: {
    name: "轻量节奏",
    short: "轻量",
    description: "适合小课题，1–3 次课就能走完，部分阶段作为检查点带过。",
  },
  standard: {
    name: "标准节奏",
    short: "标准",
    description: "每个阶段都有明确练习，按每周投入稳步推进。",
  },
  deep: {
    name: "深入节奏",
    short: "深入",
    description: "适合复杂主题，每阶多周投入，例子和练习更充分。",
  },
};

export interface Project {
  id: string;
  topic: string;
  goal: string;
  background: string;
  weeklyHours: number;
  pace: ProjectPace;
  currentStage: Stage | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  ladderCount: number;
  lessonCount: number;
  assessmentCount: number;
  examCount: number;
  examAvg: number | null;
  feynmanPassed: number;
  feynmanActive: number;
}

export const LESSON_MODES = [
  "standard",
  "plain",
  "socratic",
  "analogy",
  "case",
] as const;

export type LessonMode = (typeof LESSON_MODES)[number];

export const LESSON_MODE_META: Record<
  LessonMode,
  { name: string; short: string; description: string }
> = {
  standard: {
    name: "标准讲解",
    short: "标准",
    description: "结构清晰地讲原理、给例子、做练习。",
  },
  plain: {
    name: "白话解释",
    short: "白话",
    description: "尽量不用术语，先说人话，再把术语对回来。",
  },
  socratic: {
    name: "苏格拉底式",
    short: "提问",
    description: "用一连串问题引导你自己推理出结论。",
  },
  analogy: {
    name: "类比式",
    short: "类比",
    description: "用一个贯穿的生活类比解释每个机制。",
  },
  case: {
    name: "案例驱动",
    short: "案例",
    description: "从真实案例或项目出发，边拆边学。",
  },
};

export interface ProjectSource {
  id: string;
  projectId: string;
  name: string;
  mime: string;
  charCount: number;
  createdAt: string;
}

export type LessonKind =
  | "concept"
  | "example"
  | "practice"
  | "pitfall"
  | "summary";

export interface LessonExample {
  title: string;
  language: string;
  content: string;
}

export interface LessonSection {
  title: string;
  kind: LessonKind;
  minutes: number;
  content: string;
  /** 承接上一节 / 主线的过渡；旧课程可能没有。 */
  bridge?: string;
  /** 本节要带走的一句话结论；旧课程可能没有。 */
  takeaway?: string;
  keyPoints: string[];
  example: LessonExample | null;
  practice: string;
  checkpoint: string;
}

export interface LessonPlan {
  title: string;
  /** 贯穿本阶段五节的主线；旧课程可能没有。 */
  throughline?: string;
  overview: string;
  totalMinutes: number;
  keyPoints: string[];
  sections: LessonSection[];
  nextStep: string;
}

export interface StageLesson {
  id: string;
  projectId: string;
  stage: Stage;
  mode: LessonMode;
  title: string;
  plan: LessonPlan;
  completed: number[];
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonSummary {
  id: string;
  projectId: string;
  stage: Stage;
  mode: LessonMode;
  title: string;
  sectionCount: number;
  completedCount: number;
  updatedAt: string;
}

export interface LadderLevel {
  id: string;
  projectId: string;
  stage: Stage;
  title: string;
  summary: string;
  mustMaster: string[];
  commonMistakes: string[];
  gateCriteria: string;
  practice: string;
  /** null 表示未估算；0 表示检查点，随前一阶带过。 */
  estimatedSessions: number | null;
  estimatedHours: number | null;
  estimatedWeeks: number | null;
  updatedAt: string;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  hint: string;
  /** 4 个行为选项；旧版问答题没有该字段。 */
  options?: string[];
}

export interface StageResult {
  stage: Stage;
  evidence: string[];
  nextStep: string;
}

export type AssessmentStatus = "draft" | "submitted" | "scored";

export interface StageAssessment {
  id: string;
  projectId: string;
  questions: AssessmentQuestion[];
  answers: Record<string, string> | null;
  result: StageResult | null;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type ExamStatus = "active" | "finished";
export type ExamQuestionType = "choice" | "short";

export interface ExamSession {
  id: string;
  projectId: string;
  status: ExamStatus;
  questionType: ExamQuestionType;
  maxQuestions: number;
  difficulty: number;
  avgScore: number | null;
  report: ExamReport | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface ExamEvaluation {
  score: number;
  correct: string[];
  missing: string[];
  wrong: string[];
  explanation: string;
}

export interface ExamTurn {
  id: string;
  sessionId: string;
  idx: number;
  question: string;
  /** 4 个选项；旧版问答题为空数组。 */
  options: string[];
  /** 正确选项的下标（从 0 开始）；旧版问答题为 null。 */
  correct: number | null;
  /** 本题解析，答题后展示。 */
  explanation: string | null;
  /** 简答题的参考答案；单选题为 null。 */
  reference: string | null;
  /** 用于错题聚合的知识点；旧题可能为 null。 */
  topic: string | null;
  difficulty: number;
  /** 学习者选择的选项文本；旧版问答题为自由文本。 */
  answer: string | null;
  score: number | null;
  feedback: ExamEvaluation | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface ExamGap {
  topic: string;
  why: string;
  severity: "high" | "medium" | "low";
}

export interface ExamReviewItem {
  title: string;
  action: string;
  minutes: number;
}

export interface ExamReport {
  overallScore: number;
  strengths: string[];
  gaps: ExamGap[];
  reviewPlan: ExamReviewItem[];
  nextFocus: string;
}

export type FeynmanStatus = "active" | "passed";

export interface FeynmanCritique {
  correct: string[];
  missing: string[];
  confused: string[];
  jargon: string[];
  clarity: number;
  mastery: number;
  passed: boolean;
  feedback: string;
  followUpQuestion: string;
}

export interface FeynmanSession {
  id: string;
  projectId: string;
  concept: string;
  status: FeynmanStatus;
  rounds: number;
  mastery: number | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
  passedAt: string | null;
}

export type FeynmanRole = "ai" | "user" | "system";
export type FeynmanKind =
  | "explain"
  | "restate"
  | "feedback"
  | "retry-explain"
  | "note";

export interface FeynmanMessage {
  id: string;
  sessionId: string;
  round: number;
  role: FeynmanRole;
  kind: FeynmanKind;
  content: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface ExamSessionDetail {
  session: ExamSession;
  turns: ExamTurn[];
}

export interface FeynmanSessionDetail {
  session: FeynmanSession;
  messages: FeynmanMessage[];
}

export interface SelfCheckQuestion {
  question: string;
  hint: string;
  answer: string;
  source: string;
}

export interface SelfCheckSet {
  questions: SelfCheckQuestion[];
  meta: Record<string, unknown> | null;
  updatedAt: string;
}

export interface AiConfigState {
  configured: boolean;
  source: "settings" | "env" | "none";
  keyMasked: string | null;
  baseUrl: string;
  model: string;
  thinking: boolean;
  effort: string;
}

export type ActivityKind = "assessment" | "lesson" | "exam" | "feynman";

export interface ActivityItem {
  kind: ActivityKind;
  id: string;
  title: string;
  detail: string;
  at: string;
}
