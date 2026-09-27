import type { Knowledge, Pattern, Subtopic } from "@/types/agent";

const comparativeSubtopic: Subtopic = {
  id: "comparative-basic",
  knowledgeId: "comparative",
  name: "普通比较级",
  description: "理解两者比较，并使用比较级表达 A 比 B 更……",
  minimumQuestions: 10,
  targetAccuracy: 90,
  patterns: [
    {
      id: "comparative-form",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "比较级基本形式",
      description: "识别和理解 taller、faster 等比较级形式。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["tall", "fast", "long"],
      examples: [
        { id: "tall-comparative", text: "tall → taller", base: "tall", comparative: "taller", coverageItemId: "tall" },
        { id: "fast-comparative", text: "fast → faster", base: "fast", comparative: "faster", coverageItemId: "fast" },
        { id: "long-comparative", text: "long → longer", base: "long", comparative: "longer", coverageItemId: "long" },
      ],
    },
    {
      id: "comparative-than",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "比较级 + than",
      description: "理解 than 后面是比较对象，并能识别比较关系。",
      required: true,
      minimumQuestions: 3,
      examples: [
        { id: "tom-ken", text: "Tom is taller than Ken." },
        { id: "run-faster", text: "I run faster than Misa." },
      ],
    },
    {
      id: "which-comparative",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "Which A or B",
      description: "理解 Which ... A or B? 是在比较两个对象。",
      required: true,
      minimumQuestions: 3,
      examples: [{ id: "april-may", text: "Which is longer, April or May?" }],
    },
  ],
};

const superlativeSubtopic: Subtopic = {
  id: "superlative-basic",
  knowledgeId: "comparative",
  name: "最高级",
  description: "理解三者或更多对象中最……，并掌握 the/of/in 等句型。",
  minimumQuestions: 12,
  targetAccuracy: 90,
  patterns: [
    {
      id: "superlative-form",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "最高级基本形式",
      description: "识别 tallest、fastest 等最高级形式。",
      required: true,
      minimumQuestions: 2,
      coverageItems: ["tall", "fast"],
      examples: [
        { id: "tall-superlative", text: "tall → tallest", base: "tall", superlative: "tallest", coverageItemId: "tall" },
        { id: "fast-superlative", text: "fast → fastest", base: "fast", superlative: "fastest", coverageItemId: "fast" },
      ],
    },
    {
      id: "superlative-the",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "the + 最高级",
      description: "理解最高级前通常使用 the。",
      required: true,
      minimumQuestions: 2,
      examples: [{ id: "tom-tallest", text: "Tom is the tallest." }],
    },
    {
      id: "superlative-of",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "of + 人/物",
      description: "理解 of 后面表示比较范围中的人或物。",
      required: true,
      minimumQuestions: 2,
      examples: [
        { id: "three-of", text: "Tom is the tallest of the three." },
        { id: "interesting-of-all", text: "Tom is the most interesting of all." },
      ],
    },
    {
      id: "superlative-in",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "in + 地点/范围",
      description: "理解 in 用于班级、家庭、地点等范围。",
      required: true,
      minimumQuestions: 2,
      examples: [
        { id: "fastest-class", text: "I run the fastest in my class." },
        { id: "tallest-class", text: "Tom is the tallest in the class." },
      ],
    },
    {
      id: "which-superlative",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "Which + 最高级",
      description: "理解 Which ... is the + 最高级? 的结构。",
      required: true,
      minimumQuestions: 2,
      examples: [{ id: "strongest-animal", text: "Which animal is the strongest?" }],
    },
  ],
};

const formChangeSubtopic: Subtopic = {
  id: "form-change",
  knowledgeId: "comparative",
  name: "比较级 / 最高级词形变化",
  description: "系统学习普通变化、特殊拼写和 more/most、不规则变化。",
  minimumQuestions: 24,
  targetAccuracy: 90,
  patterns: [
    {
      id: "regular",
      knowledgeId: "comparative",
      subtopicId: "form-change",
      name: "普通变化",
      description: "一般情况下直接加 -er / -est。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["long", "tall", "fast"],
      examples: [
        { id: "long-forms", text: "long → longer → longest", base: "long", comparative: "longer", superlative: "longest", coverageItemId: "long" },
        { id: "tall-forms", text: "tall → taller → tallest", base: "tall", comparative: "taller", superlative: "tallest", coverageItemId: "tall" },
        { id: "fast-forms", text: "fast → faster → fastest", base: "fast", comparative: "faster", superlative: "fastest", coverageItemId: "fast" },
      ],
    },
    {
      id: "e-ending",
      knowledgeId: "comparative",
      subtopicId: "form-change",
      name: "e 结尾",
      description: "以 e 结尾时，只加 -r / -st。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["large", "nice"],
      examples: [
        { id: "large-forms", text: "large → larger → largest", base: "large", comparative: "larger", superlative: "largest", coverageItemId: "large" },
        { id: "nice-forms", text: "nice → nicer → nicest", base: "nice", comparative: "nicer", superlative: "nicest", coverageItemId: "nice" },
      ],
    },
    {
      id: "y-ending",
      knowledgeId: "comparative",
      subtopicId: "form-change",
      name: "y 结尾",
      description: "辅音字母 + y：y 改 i，再加 -er / -est。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["busy", "easy", "happy"],
      examples: [
        { id: "busy-forms", text: "busy → busier → busiest", base: "busy", comparative: "busier", superlative: "busiest", coverageItemId: "busy" },
        { id: "easy-forms", text: "easy → easier → easiest", base: "easy", comparative: "easier", superlative: "easiest", coverageItemId: "easy" },
        { id: "happy-forms", text: "happy → happier → happiest", base: "happy", comparative: "happier", superlative: "happiest", coverageItemId: "happy" },
      ],
    },
    {
      id: "double-consonant",
      knowledgeId: "comparative",
      subtopicId: "form-change",
      name: "双写最后一个辅音字母",
      description: "双写最后一个辅音字母，再加 -er / -est。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["big", "hot"],
      examples: [
        { id: "big-forms", text: "big → bigger → biggest", base: "big", comparative: "bigger", superlative: "biggest", coverageItemId: "big" },
        { id: "hot-forms", text: "hot → hotter → hottest", base: "hot", comparative: "hotter", superlative: "hottest", coverageItemId: "hot" },
      ],
    },
    {
      id: "more-most",
      knowledgeId: "comparative",
      subtopicId: "form-change",
      name: "more / most",
      description: "较长形容词使用 more / most，不能直接加 -er / -est。",
      required: true,
      minimumQuestions: 4,
      coverageItems: ["popular", "useful", "difficult"],
      examples: [
        { id: "popular-forms", text: "popular → more popular → most popular", base: "popular", comparative: "more popular", superlative: "most popular", coverageItemId: "popular" },
        { id: "useful-forms", text: "useful → more useful → most useful", base: "useful", comparative: "more useful", superlative: "most useful", coverageItemId: "useful" },
        { id: "difficult-forms", text: "difficult → more difficult → most difficult", base: "difficult", comparative: "more difficult", superlative: "most difficult", coverageItemId: "difficult" },
      ],
    },
    {
      id: "irregular",
      knowledgeId: "comparative",
      subtopicId: "form-change",
      name: "不规则变化",
      description: "核心不规则形式必须逐词覆盖，覆盖不等于掌握。",
      required: true,
      minimumQuestions: 5,
      coverageItems: ["good", "well", "bad", "little", "many", "much"],
      examples: [
        { id: "good-forms", text: "good → better → best", base: "good", comparative: "better", superlative: "best", coverageItemId: "good" },
        { id: "well-forms", text: "well → better → best", base: "well", comparative: "better", superlative: "best", coverageItemId: "well" },
        { id: "bad-forms", text: "bad → worse → worst", base: "bad", comparative: "worse", superlative: "worst", coverageItemId: "bad" },
        { id: "little-forms", text: "little → less → least", base: "little", comparative: "less", superlative: "least", coverageItemId: "little" },
        { id: "many-forms", text: "many → more → most", base: "many", comparative: "more", superlative: "most", coverageItemId: "many" },
        { id: "much-forms", text: "much → more → most", base: "much", comparative: "more", superlative: "most", coverageItemId: "much" },
      ],
    },
  ],
};

const asAsSubtopic: Subtopic = {
  id: "as-as",
  knowledgeId: "comparative",
  name: "同级比较",
  description: "理解 as...as 和 not as...as 的含义与结构。",
  minimumQuestions: 9,
  targetAccuracy: 90,
  patterns: [
    {
      id: "as-as",
      knowledgeId: "comparative",
      subtopicId: "as-as",
      name: "as...as",
      description: "as + 形容词/副词 + as 表示和……一样……。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["big", "tall", "fast"],
      examples: [
        { id: "dog-as-big", text: "My dog is as big as yours.", base: "big", coverageItemId: "big" },
        { id: "tall-as", text: "Tom is as tall as Ken.", base: "tall", coverageItemId: "tall" },
        { id: "fast-as", text: "I run as fast as Misa.", base: "fast", coverageItemId: "fast" },
      ],
    },
    {
      id: "not-as-as",
      knowledgeId: "comparative",
      subtopicId: "as-as",
      name: "not as...as",
      description: "not as + 形容词/副词 + as 表示没有……那么……。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["tall", "big", "fast"],
      examples: [
        { id: "not-tall", text: "I'm not as tall as Penny.", base: "tall", coverageItemId: "tall" },
        { id: "not-big", text: "This box is not as big as that one.", base: "big", coverageItemId: "big" },
        { id: "not-fast", text: "I don't run as fast as Misa.", base: "fast", coverageItemId: "fast" },
      ],
    },
  ],
};

export const comparativeKnowledge: Knowledge = {
  id: "comparative",
  title: "比较级与比较表达",
  description: "通过四个 Subtopic 和细粒度 Pattern，掌握比较、最高级、词形变化和同级比较。",
  subtopics: [
    comparativeSubtopic,
    superlativeSubtopic,
    formChangeSubtopic,
    asAsSubtopic,
  ],
};

export const knowledgeCatalog: Knowledge[] = [comparativeKnowledge];

export function getKnowledge(id: string): Knowledge | undefined {
  return knowledgeCatalog.find((knowledge) => knowledge.id === id);
}

export function getSubtopic(
  knowledge: Knowledge,
  subtopicId: string,
): Subtopic | undefined {
  return knowledge.subtopics.find((subtopic) => subtopic.id === subtopicId);
}

export function getPattern(
  knowledge: Knowledge,
  patternId: string,
): Pattern | undefined {
  for (const subtopic of knowledge.subtopics) {
    const pattern = subtopic.patterns.find((item) => item.id === patternId);
    if (pattern) return pattern;
  }
  return undefined;
}

export function getPatternsForSubtopic(subtopic: Subtopic): Pattern[] {
  return subtopic.patterns;
}
