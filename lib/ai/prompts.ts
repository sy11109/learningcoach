import type {
  AssessmentQuestion,
  ExamQuestionType,
  ExamSession,
  ExamTurn,
  FeynmanMessage,
  FeynmanSession,
  LadderLevel,
  LessonMode,
  Project,
  Stage,
} from "@/lib/types";
import { PROJECT_PACE_META, STAGE_META } from "@/lib/types";
import type { ChatMessage } from "@/lib/ai/client";
import { truncate } from "@/lib/utils";

const METHOD = `你是「AI 学习教练」，基于六步闭环学习法与五阶段能力地图工作。
五阶段能力地图：
- 阶段1 入门——能跑起来：掌握基础概念，能写小脚本/简单页面。判据：能脱离教程完成小练习。
- 阶段2 进阶——能做项目：会用框架，能跟做完整应用。判据：能独立完成模块级任务。
- 阶段3 熟练——独立交付：工程化、能独立从 0 做可上线项目。判据：能用 STAR 讲清项目取舍。
- 阶段4 精通——能设计：系统设计、技术选型、带团队。判据：能解释设计与权衡。
- 阶段5 大神——有影响力：领域专家、技术输出、解决行业难题。
你的风格：直接、具体、可执行，拒绝空泛套话。`;

const JSON_RULE =
  "只输出 json 本体，不要解释，不要 markdown 代码围栏。";

function projectBlock(project: Project): string {
  const lines = [`学习主题：${project.topic}`];
  if (project.goal) lines.push(`学习目标：${project.goal}`);
  if (project.background) lines.push(`学习者背景：${project.background}`);
  lines.push(`每周可投入：约 ${project.weeklyHours} 小时`);
  lines.push(
    `学习节奏：${PROJECT_PACE_META[project.pace].name}——${
      PROJECT_PACE_META[project.pace].description
    }`,
  );
  if (project.currentStage) {
    lines.push(
      `当前阶段：${STAGE_META[project.currentStage].name}——${STAGE_META[project.currentStage].tagline}`,
    );
  }
  return lines.join("\n");
}

function stageLabel(stage: Stage | null | undefined): string {
  if (!stage) return "尚未定位（按阶段 2 处理）";
  return `${STAGE_META[stage].name}——${STAGE_META[stage].tagline}`;
}

function ladderBlock(ladder: LadderLevel[]): string {
  if (ladder.length === 0) return "（尚未生成学习阶梯）";
  return ladder
    .map((level) => {
      const must = level.mustMaster.map((item) => `  - ${item}`).join("\n");
      return `${level.stage}. ${level.title}：${level.summary}\n${must}`;
    })
    .join("\n");
}

function sourceBlock(
  sources: Array<{ name: string; text: string }>,
  totalChars = 6000,
): string {
  if (sources.length === 0) return "";
  const perFile = Math.max(
    1200,
    Math.floor(totalChars / Math.min(sources.length, 3)),
  );
  const parts = sources
    .slice(0, 3)
    .map((source) => `《${source.name}》摘录：\n${truncate(source.text, perFile)}`)
    .join("\n\n");
  return `

学习者上传的资料（优先依据这些资料的范围、术语和顺序来教；不要编造资料里没有的章节或结论）：
${parts}`;
}

const LESSON_MODE_RULES: Record<LessonMode, string> = {
  standard:
    "模式：标准讲解。先给结论和原理，再给步骤与例子，解释因果关系。",
  plain:
    "模式：白话解释。假设学习者没有相关背景：先用日常生活语言说清「它是什么、为什么需要、怎么用」，再补正式术语；每出现一个术语，立刻用一句人话解释。不要堆砌专业词。",
  socratic:
    "模式：苏格拉底式启发。每一节都从一个关键问题开始，先摆出常见但错误的直觉，再用 3-5 个递进追问拆开它，最后让学习者自己得出结论。content 中要明确写出这条问题链，结论放在问题之后，不要一上来就给答案。",
  analogy:
    "模式：类比式。为这一阶选一个贯穿全课的生活类比（例如厨房、交通、图书馆），每节用同一个类比解释一个机制，并点明类比的边界：哪里像、哪里不像。",
  case:
    "模式：案例驱动。围绕一个具体、可复现的真实案例或小项目展开；每节推进案例的一个阶段：先给场景和问题，再给做法和结果，最后抽出可迁移的规则。",
};

function lessonEstimate(level: LadderLevel): string {
  if (
    level.estimatedSessions === null &&
    level.estimatedHours === null &&
    level.estimatedWeeks === null
  ) {
    return "未估算，按标准节奏处理";
  }
  if (level.estimatedSessions === 0) {
    return "检查点：不单独排课，随前一阶带过；内容要短、只保留最关键的迁移点";
  }
  const parts: string[] = [];
  if (level.estimatedSessions !== null) parts.push(`约 ${level.estimatedSessions} 次课`);
  if (level.estimatedHours !== null) parts.push(`共 ${level.estimatedHours} 小时`);
  if (level.estimatedWeeks !== null) parts.push(`跨 ${level.estimatedWeeks} 周`);
  return parts.join(" · ") || "未估算，按标准节奏处理";
}

function lessonLevelBlock(level: LadderLevel): string {
  return [
    `阶段：第 ${level.stage} 阶`,
    `标题：${level.title}`,
    `这一阶的状态：${level.summary}`,
    `课时估算：${lessonEstimate(level)}`,
    `必须掌握：\n${level.mustMaster.map((item) => `- ${item}`).join("\n")}`,
    `常见错误：\n${level.commonMistakes
      .map((item) => `- ${item}`)
      .join("\n")}`,
    `过关标准：${level.gateCriteria}`,
    `练习建议：${level.practice}`,
  ].join("\n");
}

export function buildLessonMessages(params: {
  project: Project;
  ladder: LadderLevel[];
  level: LadderLevel;
  mode: LessonMode;
  sources?: Array<{ name: string; text: string }>;
}): ChatMessage[] {
  const { project, ladder, level, mode, sources = [] } = params;
  const system = `${METHOD}

任务：为学习者的指定阶段写一份「可以照着学的课程」，不是提纲，也不是任务清单。
${LESSON_MODE_RULES[mode]}
硬性要求：
1. 一条主线：本阶段只围绕一个具体项目、案例或真实问题展开（例如「给一个待办应用加标签筛选」）。5 节是同一条主线上的 5 个推进步骤，后一节必须建立在前一节的产出之上；禁止把 5 个互不相关的知识点拼盘。在顶层写 throughline（20-100 字），说明这条主线是什么、5 节如何沿它推进。
2. 只针对本次指定阶段，紧扣它的「必须掌握」和「常见错误」；不要提前讲后面阶段的内容。
3. 恰好 5 节，顺序要有教学逻辑：1 节 concept（讲清原理或机制）、1 节 example（拆一个具体例子）、1 节 practice（动手任务）、1 节 pitfall（针对常见错误）；最后一节必须是 summary。这五种 kind 各出现一次。
4. 每节必须写 bridge（1-60 字）：承接上一节，并说明本节在主线上推进了什么；第一节说明它与主线的关系。还要写 takeaway（1-60 字）：一句可以带走的结论，必须具体、可检验，不要写「本节很重要」。
5. content 是真正的讲解，200-450 字：不能只写「是什么」，必须写清「为什么这样、什么时候用、怎么判断」；至少包含一个具体场景、数据或代码片段；讲常见错误时按「症状 → 原因 → 改法」写。用 \\n\\n 分段，可以用「- 」列点。用 **双星号** 包住每节 1-3 个真正关键、容易错或容易忘的短语（前端会高亮成重点）；用 \`反引号\` 标代码、命令或字段名。禁止「本节将介绍」「希望大家掌握」这类空话。
6. keyPoints 每节 1-3 条，必须是可检验的结论或动作；顶层 keyPoints 3-5 条，是全课最该记住的内容。禁止「理解/熟悉/掌握 XX」这种无法检验的表述。
7. example 要可运行、可复现：代码、命令、数据或完整案例；language 填 ts/python/sql/bash/json/text 等。没有合适例子时 example 为 null。
8. practice 是一个 10-40 分钟内能做完的任务，写清「做什么 + 完成标准」；checkpoint 是一道能自测的问题，不要给答案。
9. 根据本阶课时估算控制篇幅与练习量：估算为检查点时，内容更紧凑、只保留迁移点；1-2 次课的轻量阶段总时长约 60-120 分钟、练习 1 个；次数多、周数长的深入阶段总时长约 150-300 分钟，例子和练习可以分步骤加深，但仍然是同一条主线的 5 节，不得拆成互不相关的专题。
10. 结合学习者背景和目标调整起点：基础弱就补必要前置，有基础就直接讲难点。
11. 中文，直接、具体。写学习内容本身，不要写学习计划。
${JSON_RULE}
结构示例：
{"title":"……","overview":"这一阶段学什么、学完能做什么","throughline":"……","totalMinutes":90,"keyPoints":["……","……","……"],"sections":[{"title":"……","kind":"concept","minutes":20,"bridge":"……","takeaway":"……","content":"……**关键短语**……\\n\\n……","keyPoints":["……"],"example":{"title":"……","language":"ts","content":"……"},"practice":"……完成标准：……","checkpoint":"……？"}],"nextStep":"学完后……"}
sections 必须恰好 5 节，概念、例子、练习、易错点各一节，最后一节 kind 为 summary。`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}

本次只学第 ${level.stage} 阶：
${lessonLevelBlock(level)}

完整阶梯（用来把握前后关系，不要越阶教学）：
${ladderBlock(ladder)}${sourceBlock(sources)}

请按上面的模式要求，写出这一阶段可以照着学的 5 节内容。`,
    },
  ];
}

export function buildLadderMessages(
  project: Project,
  sources: Array<{ name: string; text: string }> = [],
): ChatMessage[] {
  const system = `${METHOD}

任务：为学习者生成 5 级学习阶梯（对应五阶段）。
阶梯只负责「定位和验收」，具体讲解、例子和练习会放在学习内容里，所以这里要短而准，不要写成长篇教程。
硬性要求：
1. 每级包含：title、summary（不超过 60 字）、mustMaster（恰好 3 条）、commonMistakes（恰好 2 条）、gateCriteria（不超过 120 字）、practice（不超过 100 字）。
2. mustMaster 的每一条都必须可验证、可观察：能写出来、能做出来、能交付。禁止「理解/熟悉/了解/掌握 XX」这类无法检验的表述。
3. commonMistakes 必须具体到该主题的真实场景，不要通用套话。
4. gateCriteria 必须是一道可自测的题或一个可交付的小产物。
5. practice 只写一个能在 30 分钟内动手完成的小任务，细节留给学习内容。
6. 结合学习者背景和目标调整深度；如果已有基础，不要假装从零开始。
7. 恰好 5 级，stage 依次为 1、2、3、4、5，title 使用「阶段N 名称 — 一句话」格式。
8. 每级必须给出三个估算：estimatedSessions（这一阶大约需要几次课，整数 0-40）、estimatedHours（这一阶总学习小时，0-500）、estimatedWeeks（这一阶跨几周，0-52）。
   - estimatedSessions = 0 表示「检查点」：这一阶不单独排课，随前一阶带过。只有确实很快通过时才能用 0。
   - 估算要互相自洽：estimatedHours 约等于 estimatedWeeks × 每周投入；五阶之和要与项目规模相称。
   - 轻量节奏（light）：整个项目约 1-3 次课，绝大多数阶段可设为 0-1 次课的检查点，只把当前真正要练的一两阶留出课时；不能为了凑五阶写重复内容。
   - 标准节奏（standard）：每阶约 1-4 次课、1-4 周，按每周投入稳步推进。
   - 深入节奏（deep）：复杂主题，每阶约 3-10 次课、2-8 周；周数 × 每周投入应明显大于标准节奏。
${JSON_RULE}
结构示例：
{"levels":[{"stage":1,"title":"阶段1 入门 — 能跑起来","summary":"能脱离教程完成小练习。","mustMaster":["能独立写出一个……","能解释……为什么","能交付……"],"commonMistakes":["……","……"],"gateCriteria":"不看教程，独立完成……","practice":"用 30 分钟做一个……","estimatedSessions":2,"estimatedHours":6,"estimatedWeeks":1.5}]}`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}${sourceBlock(
        sources,
      )}\n\n请生成 5 级学习阶梯。`,
    },
  ];
}

export function buildAssessmentQuestionsMessages(
  project: Project,
  ladder: LadderLevel[],
): ChatMessage[] {
  const system = `${METHOD}

任务：生成 5 道「阶段定位」单选题，用来判断学习者当前处于五阶段中的哪一阶段。
要求：
1. 考行为，不考知识。每题问一个具体场景下「你实际会怎么做 / 做到过什么」，让学习者从 4 个行为选项中选最接近真实情况的一项。
2. 每题恰好 4 个选项。每个选项都要描述一种具体、可观察的行为或产出状态，并覆盖不同水平：从依赖教程、照步骤做，到能独立完成、能讲清取舍。
3. 选项顺序打乱，不要把「最高水平」固定在同一个位置，也不要在选项里写「阶段1/阶段2」或标注正确答案。
4. 覆盖这些判据：能否脱离教程（阶段 1-2 依赖教程，阶段 3+ 能独立）、卡住后先定位问题还是直接要现成答案、能否讲清设计与权衡、是否有对外输出或影响力。
5. 题目必须结合该学习主题的具体场景，不要问通用性格题，也不要问「你觉得自己几级」。
6. 每题给一句 hint，提示按最近一次的真实情况选，不要美化。
${JSON_RULE}
结构示例：
{"questions":[{"question":"……时，你通常会？","hint":"按最近一次的真实情况选","options":["……","……","……","……"]},{"question":"……？","hint":"……","options":["……","……","……","……"]}]}
必须恰好 5 题，每题恰好 4 个选项。`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}\n\n现有学习阶梯（仅作参考，不要照抄标题）：\n${ladderBlock(
        ladder,
      )}\n\n请生成 5 道定位题。`,
    },
  ];
}

export function buildStageEvaluationMessages(params: {
  project: Project;
  ladder: LadderLevel[];
  questions: AssessmentQuestion[];
  answers: Record<string, string>;
}): ChatMessage[] {
  const { project, ladder, questions, answers } = params;
  const system = `${METHOD}

任务：根据学习者在 5 道行为单选题中的选择，判定其当前阶段（1-5）。
要求：
1. 每题的 4 个选项分别代表不同水平的行为；只依据学习者所选行为的水平判断，不要因为选项写得漂亮就给高分，也不要假设学习者做过选项之外的事。
2. evidence 至少 2 条，必须引用或转述学习者选中的具体行为作为依据，不要写空话。
3. nextStep 必须具体：接下来 2 周最该做什么，能直接执行。
4. stage 必须是 1-5 的整数。
${JSON_RULE}
结构示例：
{"stage":3,"evidence":["你选择了「……」，说明……","你选择了「……」，这符合阶段3的……」],"nextStep":"接下来两周……"}`;

  const qa = questions
    .map((question) => {
      const answer = answers[question.id]?.trim() || "（未选择）";
      return `Q${question.id.slice(1)}：${question.question}\n选择：${truncate(answer, 300)}`;
    })
    .join("\n\n");

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}\n\n学习阶梯：\n${ladderBlock(
        ladder,
      )}\n\n诊断问答：\n${qa}\n\n请判定阶段并给出证据与下一步。`,
    },
  ];
}

export function buildExamStartMessages(params: {
  project: Project;
  ladder: LadderLevel[];
  difficulty: number;
  focus: string;
  maxQuestions: number;
  questionType: ExamQuestionType;
}): ChatMessage[] {
  const { project, ladder, difficulty, focus, maxQuestions, questionType } =
    params;
  const isShort = questionType === "short";

  const rules = isShort
    ? `你是本次的 AI 考官，负责用简答题考核学习者。
规则：
1. 本次最多 ${maxQuestions} 题，起始难度 ${difficulty}（1-5）。
2. 只出一道简答题：题干是一个可判定的具体问题（解释机制、说明为什么、给出做法），不要问「谈谈你的理解」这类开放题。
3. reference 是参考答案与评分要点：用一段话写清必须答到的关键术语、因果关系和边界，120-300 字；不是唯一答案，而是判分依据。
4. topic 是这道题对应的知识点，用阶梯里的短术语（如「闭包」「索引失效」），不要写整句话；后续错题会按它聚合。
5. 以基础概念和直接应用为主，不要出偏题、超纲题或需要长篇论述的题。
6. 不要一次问多个问题；结合主题${focus ? "与聚焦范围" : ""}，不要出无关题。
${JSON_RULE}
结构示例：{"question":"……为什么……？请说明机制。","reference":"评分要点：……；……；……","topic":"……","difficulty":${difficulty}}`
    : `你是本次的 AI 考官，负责用单选题考核学习者。
规则：
1. 本次最多 ${maxQuestions} 题，起始难度 ${difficulty}（1-5）。
2. 只出一道单选题，恰好 4 个选项，有且只有一个正确。
3. 以基础概念、术语含义和直接应用为主：题目要短、直白，不要出偏题、超纲题、多步推理题或需要长篇论述的题。
4. 干扰项要合理，但错误要明确，不要玩文字游戏。
5. correct 是正确选项的下标（从 0 开始）；explanation 用 1-2 句话说明为什么正确。
6. topic 是这道题对应的知识点，用阶梯里的短术语（如「闭包」「索引失效」），不要写整句话；后续错题会按它聚合。
7. 不要一次问多个问题；结合主题${focus ? "与聚焦范围" : ""}，不要出无关题。
${JSON_RULE}
结构示例：{"question":"……？","options":["……","……","……","……"],"correct":1,"explanation":"……","topic":"……","difficulty":${difficulty}}`;

  const system = `${METHOD}

${rules}`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}\n\n学习阶梯：\n${ladderBlock(
        ladder,
      )}\n\n${focus ? `聚焦范围：${focus}\n\n` : ""}请出第一道${isShort ? "简答" : "单选"}题。`,
    },
  ];
}

export function buildExamNextQuestionMessages(params: {
  project: Project;
  ladder: LadderLevel[];
  session: ExamSession;
  answered: ExamTurn[];
  nextDifficulty: number;
  questionType: ExamQuestionType;
}): ChatMessage[] {
  const {
    project,
    ladder,
    session,
    answered,
    nextDifficulty,
    questionType,
  } = params;
  const isShort = questionType === "short";

  const rules = isShort
    ? `你是 AI 考官，正在根据学习者的答题表现继续出简答题。
规则：
1. 只出一道简答题：题干要可判定，问机制、原因、做法或边界，不要问「谈谈你的理解」。
2. 难度目标 ${nextDifficulty}/5；以基础概念和直接应用为主，不要出偏题或超纲题。
3. reference 是参考答案与评分要点，120-300 字，写清必须答到的术语与因果。
4. topic 用阶梯里的短术语，作为知识点标签，后续错题按它聚合。
5. 优先围绕学习者答错的知识点出一道同类基础题；也可以换一个相邻的基础点。不要重复已经问过的问题，不要一次问多个问题。
${JSON_RULE}
结构示例：
{"question":"……为什么……？请说明机制。","reference":"评分要点：……；……","topic":"……","nextDifficulty":${nextDifficulty}}`
    : `你是 AI 考官，正在根据学习者的答题表现继续出单选题。
规则：
1. 只出一道单选题，恰好 4 个选项，有且只有一个正确。
2. 以基础概念和直接应用为主；难度目标 ${nextDifficulty}/5，题目要短、直白，不要出偏题、超纲题、多步推理题或需要长篇论述的题。
3. 优先围绕学习者答错的知识点出一道同类基础题，帮助巩固；也可以换一个相邻的基础点。
4. 不要重复已经问过的问题，不要一次问多个问题。
5. 干扰项要合理，但错误要明确，不要玩文字游戏。
6. correct 是正确选项的下标（从 0 开始）；explanation 用 1-2 句话说明为什么正确。
7. topic 用阶梯里的短术语，作为知识点标签，后续错题按它聚合。
${JSON_RULE}
结构示例：
{"question":"……？","options":["……","……","……","……"],"correct":2,"explanation":"……","topic":"……","nextDifficulty":${nextDifficulty}}`;

  const system = `${METHOD}

${rules}`;

  const history = answered
    .map((turn) => {
      const selected = turn.answer ?? "（未选择）";
      const keyText =
        turn.reference ??
        (turn.correct !== null
          ? turn.options[turn.correct] ?? "（未知）"
          : "（旧版题目）");
      const verdict = (turn.score ?? 0) >= (isShort ? 7 : 8) ? "答对" : "答错";
      return `Q${turn.idx + 1}（难度 ${turn.difficulty}，知识点：${
        turn.topic ?? "未标注"
      }）：${truncate(turn.question, 400)}\n学习者答案：${truncate(
        selected,
        300,
      )}\n参考答案：${truncate(keyText, 300)} · ${verdict}（${
        turn.score ?? 0
      } 分）\n解析：${truncate(turn.feedback?.explanation ?? "", 300)}`;
    })
    .join("\n\n");

  const user = `${projectBlock(project)}

学习阶梯（当前阶段参考）：
${ladderBlock(ladder)}

已答记录（${answered.length} / ${session.maxQuestions}）：
${history || "（还没有答题记录）"}

请出一道新的${isShort ? "简答" : "单选"}题，目标难度 ${nextDifficulty}/5。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildExamShortGradeMessages(params: {
  project: Project;
  ladder: LadderLevel[];
  question: string;
  reference: string;
  answer: string;
}): ChatMessage[] {
  const { project, ladder, question, reference, answer } = params;
  const system = `${METHOD}

任务：给学习者的简答题答案评分。
评分规则：
1. 只依据「参考答案与评分要点」判分，不要求措辞一致，答到关键含义即可；不引入参考资料之外的额外要求。
2. score 是 0-10 的整数：10 = 关键点齐全且表述准确；7-9 = 主体正确、少量遗漏；4-6 = 部分正确但有明显缺口；1-3 = 只沾边或有重要错误；0 = 空白或完全错误。
3. correct 列出答对的关键点；missing 列出应讲但漏掉的关键点；wrong 列出讲错或混淆的地方。每条都简短、具体。
4. explanation 用 1-2 句话说明扣分原因，并给出怎么补；不要重复整段参考答案。
${JSON_RULE}
结构示例：
{"score":7,"correct":["……"],"missing":["……"],"wrong":[],"explanation":"……"}`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}

学习阶梯（判断术语与深度时参考）：
${ladderBlock(ladder)}

题目：${question}

参考答案与评分要点：
${reference}

学习者答案：
${truncate(answer, 3000)}

请按评分规则给出 0-10 的整数分。`,
    },
  ];
}

export function buildExamReportMessages(params: {
  project: Project;
  ladder: LadderLevel[];
  session: ExamSession;
  turns: ExamTurn[];
}): ChatMessage[] {
  const { project, ladder, session, turns } = params;
  const answered = turns.filter((turn) => turn.answer !== null);
  const isShort = session.questionType === "short";

  const system = `${METHOD}

任务：根据本次${isShort ? "简答题" : "单选题"}考试的逐题记录，生成一份缺口报告。
要求：
1. ${
    isShort
      ? "本次考试为简答题：每题按参考答案给 0-10 分（7 分及以上算掌握）。"
      : "本次考试为单选题：答对 10 分，答错 0 分。"
  } overallScore 是本次平均分（0-10，保留一位小数），必须与记录中的分数一致。
2. strengths 写真正答对的基础能力，不要泛泛而谈。
3. gaps 归到知识点层面，写清具体缺口、为什么重要、严重程度（high/medium/low）；同一知识点的错题要合并。
4. reviewPlan 给 3-5 个 15-60 分钟内可完成的复习动作，必须具体到「看什么、练什么」。
5. nextFocus 一句话说明下一次考试该聚焦什么。
${JSON_RULE}
结构示例：
{"overallScore":6.5,"strengths":["……"],"gaps":[{"topic":"……","why":"……","severity":"high"}],"reviewPlan":[{"title":"……","action":"……","minutes":30}],"nextFocus":"……"}`;

  const history = answered
    .map((turn) => {
      const keyText =
        turn.reference ??
        (turn.correct !== null ? turn.options[turn.correct] ?? "" : "");
      const verdict =
        (turn.score ?? 0) >= (isShort ? 7 : 8) ? "掌握" : "未掌握";
      return `Q${turn.idx + 1}（难度 ${turn.difficulty}，知识点：${
        turn.topic ?? "未标注"
      }）：${truncate(turn.question, 400)}\n学习者答案：${truncate(
        turn.answer ?? "",
        300,
      )}\n参考答案：${truncate(keyText, 400)} · ${verdict}（${
        turn.score ?? 0
      } 分）\n解析：${truncate(turn.feedback?.explanation ?? "", 500)}`;
    })
    .join("\n\n");

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}\n\n学习阶梯：\n${ladderBlock(
        ladder,
      )}\n\n本次共 ${answered.length}/${session.maxQuestions} 题：\n${
        history || "（没有有效答题记录）"
      }\n\n请生成缺口报告。`,
    },
  ];
}

export function buildFeynmanQuestionMessages(params: {
  project: Project;
  learnedText: string;
  fallback: boolean;
  stage: Stage | null;
}): ChatMessage[] {
  const { project, learnedText, fallback, stage } = params;
  const scope = fallback
    ? `学习者还没有勾选任何「已学」节，下面是第 ${
        stage ?? 1
      } 阶的课程内容。请按这份内容出题，并在 source 里标明来自哪一节。`
    : "下面是学习者已经标记为「已学」的内容。请只围绕这些内容出题，不要考还没学过的部分。";

  const system = `${METHOD}

任务：根据学习者已经学过的内容，生成 3-5 道自测题，帮他检查自己是不是真的理解。
要求：
1. 只依据给定内容，不引入课外知识；不要考没有出现过的术语。
2. 题目要有层次：至少一道问「是什么/怎么工作」，一道问「为什么这样」，一道问「什么场景该用/怎么判断」，一道辨析常见错误。
3. question 必须是可回答的具体问题，不要问「谈谈你的理解」；尽量换一个角度，不要直接抄原文的标题或自测题。
4. hint 给一个思考方向或提示，但不能泄露答案。
5. answer 是参考答案，80-200 字，必须包含关键术语和因果，不要只写结论。
6. source 指向具体来源，格式如「第 2 阶 · 闭包与作用域 · 示例拆解」。
7. ${scope}
${JSON_RULE}
结构示例：
{"questions":[{"question":"……？","hint":"……","answer":"……","source":"第 2 阶 · …… · ……"}]}
必须 3-5 题。`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}

已学内容：
${learnedText}

请生成自测题。`,
    },
  ];
}

export function buildExplainMessages(params: {
  project: Project;
  concept: string;
  weakPoints?: { missing: string[]; confused: string[]; jargon: string[] };
}): ChatMessage[] {
  const { project, concept, weakPoints } = params;
  const system = `${METHOD}

你正在用费曼技巧讲解概念。要求：
1. 先用一句话给出定义。
2. 必须用一个生活类比贯穿全文，类比要准确，不能为了通俗而失真。
3. 不出现未解释的专业术语；必须使用时立刻用大白话解释。
4. 不超过 400 字。
5. 结尾用一个问题检查对方是否真的理解。
6. 直接输出讲解正文，不要标题、不要代码围栏、不要 markdown 符号。`;

  const weakBlock = weakPoints
    ? `\n上一轮学习者复述时暴露的问题：
- 漏掉：${weakPoints.missing.join("；") || "无"}
- 混淆：${weakPoints.confused.join("；") || "无"}
- 没真正理解的行话：${weakPoints.jargon.join("；") || "无"}
请换一个类比重新讲解，重点修复这些问题，不要重复上一轮的措辞。`
    : "";

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}\n\n概念：${concept}\n\n请开始讲解。${weakBlock}`,
    },
  ];
}

export function buildCritiqueMessages(params: {
  project: Project;
  session: FeynmanSession;
  messages: FeynmanMessage[];
  restatement: string;
  round: number;
}): ChatMessage[] {
  const { project, session, messages, restatement, round } = params;

  const system = `${METHOD}

你正在用费曼技巧检验学习者是否真正理解。请严格区分：
1. correct：学习者讲对的核心点。
2. missing：漏掉的关键点（不是锦上添花）。
3. confused：讲错、因果颠倒或概念混淆。
4. jargon：使用了但明显没真正理解的行话/术语。
5. clarity（0-10）衡量「12 岁孩子能否听懂」；mastery（0-100）衡量真实掌握程度。
6. 只有核心概念正确、类比成立、没有重大混淆时 passed=true；否则 passed=false，并给出下一轮该怎么讲。
${JSON_RULE}
结构示例：
{"correct":["……"],"missing":["……"],"confused":["……"],"jargon":["……"],"clarity":7,"mastery":55,"passed":false,"feedback":"……","followUpQuestion":"……"}`;

  const transcript = messages
    .map((message) => {
      if (message.kind === "explain" || message.kind === "retry-explain") {
        return `AI 讲解：${truncate(message.content, 1200)}`;
      }
      if (message.kind === "restate") {
        return `学习者复述：${truncate(message.content, 1200)}`;
      }
      if (message.kind === "feedback") {
        return `上一轮点评：${truncate(message.content, 800)}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `${projectBlock(project)}\n\n概念：${session.concept}\n第 ${round} 轮复述。\n\n对话记录：\n${transcript}\n\n学习者本轮复述：${truncate(
        restatement,
        2000,
      )}\n\n请判断是否真正理解。`,
    },
  ];
}

export function buildFeynmanChatContext(
  project: Project,
  concept: string,
): string {
  return `${projectBlock(project)}\n概念：${concept}\n当前阶段：${stageLabel(
    project.currentStage,
  )}`;
}
