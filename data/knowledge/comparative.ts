import type { Knowledge } from "@/types/agent";

export const comparativeKnowledge: Knowledge = {
  id: "comparative",
  title: "比较级和最高级",
  description: "学习形容词和副词的比较级、最高级变化，并在不同 subtopic 中反复练习。",
  subtopics: [
    {
      id: "regular",
      title: "一般情况",
      description: "一般情况下，比较级加 -er，最高级加 -est。",
    },
    {
      id: "e-ending",
      title: "以 e 结尾",
      description: "以 e 结尾时，只加 -r 或 -st。",
    },
    {
      id: "y-ending",
      title: "以 y 结尾",
      description: "把 y 改成 i，再加 -er 或 -est。",
    },
    {
      id: "double-consonant",
      title: "双写末尾字母",
      description: "双写最后一个字母，再加 -er 或 -est。",
    },
    {
      id: "irregular",
      title: "不规则变化",
      description: "good / well 和 many / much 需要单独记忆。",
    },
  ],
  rules: [
    {
      id: "rule-regular",
      subtopicId: "regular",
      title: "直接加 -er / -est",
      explanation: "一般情况下，在词尾直接加 -er 或 -est。",
      examples: [
        {
          id: "long-example",
          base: "long",
          comparative: "longer",
          superlative: "longest",
        },
      ],
    },
    {
      id: "rule-e-ending",
      subtopicId: "e-ending",
      title: "只加 -r / -st",
      explanation: "单词以 e 结尾时，只加 -r 或 -st。",
      examples: [
        {
          id: "large-example",
          base: "large",
          comparative: "larger",
          superlative: "largest",
        },
      ],
    },
    {
      id: "rule-y-ending",
      subtopicId: "y-ending",
      title: "y → i + er / est",
      explanation: "单词以 y 结尾时，先把 y 改成 i，再加 -er 或 -est。",
      examples: [
        {
          id: "busy-example",
          base: "busy",
          comparative: "busier",
          superlative: "busiest",
        },
        {
          id: "easy-example",
          base: "easy",
          comparative: "easier",
          superlative: "easiest",
        },
        {
          id: "early-example",
          base: "early",
          comparative: "earlier",
          superlative: "earliest",
        },
        {
          id: "happy-example",
          base: "happy",
          comparative: "happier",
          superlative: "happiest",
        },
      ],
    },
    {
      id: "rule-double-consonant",
      subtopicId: "double-consonant",
      title: "双写 + er / est",
      explanation: "符合情况的短单词，先双写最后一个字母，再加 -er 或 -est。",
      examples: [
        {
          id: "big-example",
          base: "big",
          comparative: "bigger",
          superlative: "biggest",
        },
        {
          id: "hot-example",
          base: "hot",
          comparative: "hotter",
          superlative: "hottest",
        },
      ],
    },
    {
      id: "rule-irregular",
      subtopicId: "irregular",
      title: "单独记单词",
      explanation: "good / well 变成 better / best；many / much 变成 more / most。",
      examples: [
        {
          id: "good-example",
          base: "good",
          comparative: "better",
          superlative: "best",
        },
        {
          id: "well-example",
          base: "well",
          comparative: "better",
          superlative: "best",
        },
        {
          id: "many-example",
          base: "many",
          comparative: "more",
          superlative: "most",
        },
        {
          id: "much-example",
          base: "much",
          comparative: "more",
          superlative: "most",
        },
      ],
    },
  ],
};

export const knowledgeCatalog: Knowledge[] = [comparativeKnowledge];

export function getKnowledge(id: string): Knowledge | undefined {
  return knowledgeCatalog.find((knowledge) => knowledge.id === id);
}

export function getKnowledgeSubtopic(knowledge: Knowledge, id: string) {
  return knowledge.subtopics.find((subtopic) => subtopic.id === id);
}

export function getKnowledgeRule(knowledge: Knowledge, subtopicId: string) {
  return knowledge.rules.find((rule) => rule.subtopicId === subtopicId);
}
