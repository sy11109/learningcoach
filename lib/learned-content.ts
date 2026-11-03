import { listLessons } from "@/lib/repos/lessons";
import type {
  LessonMode,
  Project,
  Stage,
  StageLesson,
} from "@/lib/types";
import { truncate } from "@/lib/utils";

export interface LearnedSection {
  stage: Stage;
  lessonTitle: string;
  title: string;
  keyPoints: string[];
  content: string;
}

export interface LearnedContent {
  /** 可直接放进提示词的已学内容摘录 */
  text: string;
  /** 没有任何已勾选的节，退回到整阶内容 */
  fallback: boolean;
  stage: Stage | null;
  sectionCount: number;
}

const MAX_TOTAL_CHARS = 6000;
const MAX_SECTION_CHARS = 900;

function byProgress(a: StageLesson, b: StageLesson): number {
  if (b.completed.length !== a.completed.length) {
    return b.completed.length - a.completed.length;
  }
  return b.updatedAt.localeCompare(a.updatedAt);
}

/** 每个阶段只取一份内容，优先已完成节数最多的模式。 */
function bestPerStage(lessons: StageLesson[]): Map<Stage, StageLesson> {
  const best = new Map<Stage, StageLesson>();
  for (const lesson of lessons) {
    if (lesson.plan.sections.length === 0) continue;
    const current = best.get(lesson.stage);
    if (!current || byProgress(lesson, current) < 0) {
      best.set(lesson.stage, lesson);
    }
  }
  return best;
}

function pickFallbackLesson(
  lessons: StageLesson[],
  currentStage: Stage | null,
): StageLesson | null {
  const withContent = lessons.filter(
    (lesson) => lesson.plan.sections.length > 0,
  );
  if (withContent.length === 0) return null;

  const targetStage =
    currentStage ?? withContent.map((lesson) => lesson.stage).sort()[0];
  const candidates = withContent
    .filter((lesson) => lesson.stage === targetStage)
    .sort(byProgress);
  if (candidates.length > 0) return candidates[0];

  const modeOrder: LessonMode[] = [
    "standard",
    "plain",
    "case",
    "socratic",
    "analogy",
  ];
  return (
    [...withContent].sort((a, b) => {
      if (a.stage !== b.stage) return a.stage - b.stage;
      return (
        modeOrder.indexOf(a.mode) - modeOrder.indexOf(b.mode)
      );
    })[0] ?? null
  );
}

function renderSection(section: LearnedSection): string {
  const points =
    section.keyPoints.length > 0
      ? `\n要点：${section.keyPoints.join("；")}`
      : "";
  return `【第 ${section.stage} 阶 · ${section.lessonTitle}】${section.title}${points}\n讲解摘录：${truncate(
    section.content,
    MAX_SECTION_CHARS,
  )}`;
}

export function collectLearnedContent(project: Project): LearnedContent {
  const lessons = listLessons(project.id);
  const best = bestPerStage(lessons);

  const completedSections: LearnedSection[] = [];
  const seen = new Set<string>();
  for (const lesson of best.values()) {
    for (const index of lesson.completed) {
      const section = lesson.plan.sections[index];
      if (!section) continue;
      const dedupeKey = `${lesson.stage}::${section.title.trim()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      completedSections.push({
        stage: lesson.stage,
        lessonTitle: lesson.plan.title,
        title: section.title,
        keyPoints: section.keyPoints,
        content: section.content,
      });
    }
  }

  completedSections.sort((a, b) => a.stage - b.stage);

  if (completedSections.length > 0) {
    return build(
      completedSections,
      false,
      completedSections[0]?.stage ?? null,
    );
  }

  const fallbackLesson = pickFallbackLesson(lessons, project.currentStage);
  if (!fallbackLesson) {
    return { text: "", fallback: true, stage: null, sectionCount: 0 };
  }

  const fallbackSections: LearnedSection[] = fallbackLesson.plan.sections.map(
    (section) => ({
      stage: fallbackLesson.stage,
      lessonTitle: fallbackLesson.plan.title,
      title: section.title,
      keyPoints: section.keyPoints,
      content: section.content,
    }),
  );

  return build(fallbackSections, true, fallbackLesson.stage);
}

function build(
  sections: LearnedSection[],
  fallback: boolean,
  stage: Stage | null,
): LearnedContent {
  const blocks: string[] = [];
  let used = 0;
  for (const section of sections) {
    const block = renderSection(section);
    if (used + block.length > MAX_TOTAL_CHARS) {
      const remaining = MAX_TOTAL_CHARS - used;
      if (remaining > 200) blocks.push(truncate(block, remaining));
      break;
    }
    blocks.push(block);
    used += block.length;
  }
  return {
    text: blocks.join("\n\n"),
    fallback,
    stage,
    sectionCount: sections.length,
  };
}
