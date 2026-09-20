import type {
  ContentSection,
  Example,
  KnowledgePoint,
  Question,
  SourceDocument,
} from "@/types/content";

export const comparativesSectionId = "comparatives";

export const comparativesKnowledgePointIds = [
  "comparative-basic",
  "comparative-e-ending",
  "comparative-y-ending",
  "comparative-double-consonant",
  "comparative-irregular",
] as const;

const basicExamples: Example[] = [
  { id: "long-forms", base: "long", comparative: "longer", superlative: "longest" },
];

const eEndingExamples: Example[] = [
  { id: "large-forms", base: "large", comparative: "larger", superlative: "largest" },
];

const yEndingExamples: Example[] = [
  { id: "busy-forms", base: "busy", comparative: "busier", superlative: "busiest" },
  { id: "easy-forms", base: "easy", comparative: "easier", superlative: "easiest" },
  { id: "early-forms", base: "early", comparative: "earlier", superlative: "earliest" },
  { id: "happy-forms", base: "happy", comparative: "happier", superlative: "happiest" },
];

const doubleConsonantExamples: Example[] = [
  { id: "big-forms", base: "big", comparative: "bigger", superlative: "biggest" },
  { id: "hot-forms", base: "hot", comparative: "hotter", superlative: "hottest" },
];

const irregularExamples: Example[] = [
  { id: "good-forms", base: "good", comparative: "better", superlative: "best" },
  { id: "well-forms", base: "well", comparative: "better", superlative: "best" },
  { id: "many-forms", base: "many", comparative: "more", superlative: "most" },
  { id: "much-forms", base: "much", comparative: "more", superlative: "most" },
];

export const comparativesKnowledgePoints: KnowledgePoint[] = [
  {
    id: "comparative-basic",
    sectionId: comparativesSectionId,
    title: "一般情况",
    category: "grammar",
    summary: "一般情况下，比较级加 -er，最高级加 -est。",
    rules: [
      {
        id: "rule-basic",
        knowledgePointId: "comparative-basic",
        title: "直接加 -er / -est",
        explanation: "一般情况下，在词尾直接加 -er 或 -est。",
        examples: basicExamples,
      },
    ],
    examples: basicExamples,
    relatedKnowledgePointIds: ["comparative-e-ending"],
  },
  {
    id: "comparative-e-ending",
    sectionId: comparativesSectionId,
    title: "以 e 结尾",
    category: "grammar",
    summary: "以 e 结尾时，只加 -r 或 -st。",
    rules: [
      {
        id: "rule-e-ending",
        knowledgePointId: "comparative-e-ending",
        title: "只加 -r / -st",
        explanation: "单词以 e 结尾时，不再重复写 e，只加 -r 或 -st。",
        examples: eEndingExamples,
      },
    ],
    examples: eEndingExamples,
    relatedKnowledgePointIds: ["comparative-basic"],
  },
  {
    id: "comparative-y-ending",
    sectionId: comparativesSectionId,
    title: "以 y 结尾",
    category: "grammar",
    summary: "把 y 改成 i，再加 -er 或 -est。",
    rules: [
      {
        id: "rule-y-ending",
        knowledgePointId: "comparative-y-ending",
        title: "y → i + er / est",
        explanation: "单词以 y 结尾时，先把 y 改成 i，再加 -er 或 -est。",
        examples: yEndingExamples,
      },
    ],
    examples: yEndingExamples,
    relatedKnowledgePointIds: ["comparative-basic"],
  },
  {
    id: "comparative-double-consonant",
    sectionId: comparativesSectionId,
    title: "双写末尾字母",
    category: "grammar",
    summary: "双写最后一个字母，再加 -er 或 -est。",
    rules: [
      {
        id: "rule-double-consonant",
        knowledgePointId: "comparative-double-consonant",
        title: "双写 + er / est",
        explanation: "符合情况的短单词，先双写最后一个字母，再加 -er 或 -est。",
        examples: doubleConsonantExamples,
      },
    ],
    examples: doubleConsonantExamples,
    relatedKnowledgePointIds: ["comparative-basic"],
  },
  {
    id: "comparative-irregular",
    sectionId: comparativesSectionId,
    title: "不规则变化",
    category: "grammar",
    summary: "这些常见单词不使用 -er / -est 规则，需要单独记住。",
    rules: [
      {
        id: "rule-irregular",
        knowledgePointId: "comparative-irregular",
        title: "单独记单词",
        explanation: "good / well 变成 better / best；many / much 变成 more / most。",
        examples: irregularExamples,
      },
    ],
    examples: irregularExamples,
    relatedKnowledgePointIds: [],
  },
];

export const comparativesQuestions: Question[] = [
  {
    id: "hot-comparative-choice",
    knowledgePointIds: ["comparative-double-consonant"],
    type: "choice",
    prompt: "hot 的比较级是？",
    options: ["hoter", "hotter", "hottest"],
    answer: "hotter",
    explanation: "hot 先双写 t，再加 -er：hot → hotter。",
    difficulty: 1,
    sourceQuestionId: "exercise-1",
    tags: ["double-consonant", "comparative"],
  },
  {
    id: "hot-superlative-fill",
    knowledgePointIds: ["comparative-double-consonant"],
    type: "fill-blank",
    prompt: "hot → hotter → ____",
    answer: "hottest",
    explanation: "hot 的最高级双写 t，再加 -est：hottest。",
    difficulty: 1,
    sourceQuestionId: "exercise-1",
    tags: ["double-consonant", "superlative"],
  },
  {
    id: "easy-comparative-fill",
    knowledgePointIds: ["comparative-y-ending"],
    type: "fill-blank",
    prompt: "easy 的比较级是 ____",
    answer: "easier",
    explanation: "y 改成 i，再加 -er：easy → easier。",
    difficulty: 2,
    sourceQuestionId: "exercise-2",
    tags: ["y-ending", "comparative"],
  },
  {
    id: "easy-superlative-choice",
    knowledgePointIds: ["comparative-y-ending"],
    type: "choice",
    prompt: "easy 的最高级是？",
    options: ["easyest", "easiest", "most easy"],
    answer: "easiest",
    explanation: "y 改成 i，再加 -est：easy → easiest。",
    difficulty: 2,
    sourceQuestionId: "exercise-2",
    tags: ["y-ending", "superlative"],
  },
  {
    id: "large-comparative-choice",
    knowledgePointIds: ["comparative-e-ending"],
    type: "choice",
    prompt: "large 的比较级是？",
    options: ["largeer", "larger", "larggest"],
    answer: "larger",
    explanation: "large 以 e 结尾，只加 -r：large → larger。",
    difficulty: 1,
    sourceQuestionId: "exercise-3",
    tags: ["e-ending", "comparative"],
  },
  {
    id: "large-superlative-fill",
    knowledgePointIds: ["comparative-e-ending"],
    type: "fill-blank",
    prompt: "large → larger → ____",
    answer: "largest",
    explanation: "large 的最高级只加 -st：largest。",
    difficulty: 1,
    sourceQuestionId: "exercise-3",
    tags: ["e-ending", "superlative"],
  },
  {
    id: "good-comparative-choice",
    knowledgePointIds: ["comparative-irregular"],
    type: "choice",
    prompt: "good 的比较级是？",
    options: ["gooder", "better", "best"],
    answer: "better",
    explanation: "good 是不规则变化：good → better → best。",
    difficulty: 1,
    sourceQuestionId: "exercise-4",
    tags: ["irregular", "comparative"],
  },
  {
    id: "good-superlative-fill",
    knowledgePointIds: ["comparative-irregular"],
    type: "fill-blank",
    prompt: "good → better → ____",
    answer: "best",
    explanation: "good 的最高级是 best。",
    difficulty: 1,
    sourceQuestionId: "exercise-4",
    tags: ["irregular", "superlative"],
  },
  {
    id: "many-comparative-choice",
    knowledgePointIds: ["comparative-irregular"],
    type: "choice",
    prompt: "many 的比较级是？",
    options: ["more", "manyer", "most"],
    answer: "more",
    explanation: "many 是不规则变化：many → more → most。",
    difficulty: 2,
    sourceQuestionId: "exercise-5",
    tags: ["irregular", "comparative"],
  },
  {
    id: "many-superlative-fill",
    knowledgePointIds: ["comparative-irregular"],
    type: "fill-blank",
    prompt: "many → more → ____",
    answer: "most",
    explanation: "many 的最高级是 most。",
    difficulty: 2,
    sourceQuestionId: "exercise-5",
    tags: ["irregular", "superlative"],
  },
  {
    id: "translate-dog-bigger",
    knowledgePointIds: ["comparative-double-consonant"],
    type: "sentence-translation",
    prompt: "翻译：我的狗比你的狗大。",
    answer: "My dog is bigger than yours.",
    explanation: "big 的比较级双写 g：bigger；比……大用 bigger than。",
    difficulty: 3,
    sourceQuestionId: "exercise-6",
    tags: ["translation", "than"],
  },
  {
    id: "translate-jack-best",
    knowledgePointIds: ["comparative-irregular"],
    type: "sentence-translation",
    prompt: "翻译：杰克（Jack）是我最好的朋友。",
    answer: "Jack is my best friend.",
    explanation: "good 的最高级 best：我最好的朋友是 my best friend。",
    difficulty: 3,
    sourceQuestionId: "exercise-7",
    tags: ["translation", "best"],
  },
  {
    id: "translate-ms-lin-busiest",
    knowledgePointIds: ["comparative-y-ending"],
    type: "sentence-translation",
    prompt: "翻译：林老师（Ms. Lin）是我们学校里最忙的老师。",
    answer: "Ms. Lin is the busiest teacher in our school.",
    explanation: "busy 的最高级把 y 改成 i：busiest；范围内最高级用 in。",
    difficulty: 4,
    sourceQuestionId: "exercise-8",
    tags: ["translation", "busiest"],
  },
  {
    id: "translate-china-canada-larger",
    knowledgePointIds: ["comparative-e-ending"],
    type: "sentence-translation",
    prompt: "翻译：中国和加拿大，哪个比较辽阔？",
    answer: "Which is larger, China or Canada?",
    explanation: "large 的比较级只加 -r：larger；二选一提问用 Which is ...?",
    difficulty: 4,
    sourceQuestionId: "exercise-9",
    tags: ["translation", "larger"],
  },
  {
    id: "translate-happiest-day",
    knowledgePointIds: ["comparative-y-ending"],
    type: "sentence-translation",
    prompt: "翻译：今天是我的人生中最快乐的一天。",
    answer: "Today is the happiest day of my life.",
    explanation: "happy 的最高级把 y 改成 i：happiest。",
    difficulty: 4,
    sourceQuestionId: "exercise-10",
    tags: ["translation", "happiest"],
  },
];

export const comparativesSection: ContentSection = {
  id: comparativesSectionId,
  sourceDocumentId: "comparatives-worksheet",
  title: "比较级和最高级",
  order: 1,
  knowledgePointIds: [...comparativesKnowledgePointIds],
  questionIds: comparativesQuestions.map((question) => question.id),
};

export const comparativesSource: SourceDocument = {
  id: "comparatives-worksheet",
  title: "比较级和最高级练习资料",
  sourceType: "worksheet",
  subject: "english",
  sections: [comparativesSection],
};

export const comparativesContent = {
  sourceDocument: comparativesSource,
  section: comparativesSection,
  knowledgePoints: comparativesKnowledgePoints,
  questions: comparativesQuestions,
};

export function getComparativesKnowledgePoint(id: string) {
  return comparativesKnowledgePoints.find((point) => point.id === id);
}
