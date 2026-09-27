import type { Knowledge, Pattern, Subtopic } from "@/types/agent";

const comparativeSubtopic: Subtopic = {
  id: "comparative-basic",
  knowledgeId: "comparative",
  name: "普通比较级",
  description: "理解两者比较，并使用比较级表达 A 比 B 更……",
  learningGoal: "理解比较级表示两者中更……，并掌握 than 和 Which...or... 句型。",
  minimumQuestions: 10,
  targetAccuracy: 90,
  patterns: [
    {
      id: "comparative-form",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "比较级基本形式",
      description: "识别和理解 taller、faster 等比较级形式。",
      explanations: ["比较级表示两个对象中“更……”。", "短形容词和副词通常加 -er，例如 tall → taller、fast → faster。"],
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
      explanations: ["当句子说明比较对象时，比较级后通常使用 than。", "基本结构：A + be + 比较级 + than + B；A + 动词 + 比较级 + than + B。"],
      required: true,
      minimumQuestions: 3,
      examples: [
        { id: "tom-ken", text: "Tom is taller than Ken." },
        { id: "run-faster", text: "I run faster than Misa." },
      ],
    },
    {
      id: "comparative-be",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "be 动词 + 比较级",
      description: "掌握 A + be + 比较级 + than + B 的基本结构。",
      explanations: ["be 动词句使用“主语 + be + 比较级 + than + 比较对象”。", "例如 Tom is taller than Ken，表示 Tom 比 Ken 高。"],
      required: true,
      minimumQuestions: 2,
      examples: [
        { id: "tom-taller", text: "Tom is taller than Ken." },
        { id: "dog-bigger", text: "My dog is bigger than yours." },
      ],
    },
    {
      id: "comparative-action",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "行为动词 + 比较级",
      description: "掌握 A + 动词 + 比较级 + than + B 的结构。",
      explanations: ["行为动词句中，比较级可以修饰动词或副词。", "例如 I run faster than Misa，表示我跑得比 Misa 快。"],
      required: true,
      minimumQuestions: 2,
      examples: [
        { id: "run-faster", text: "I run faster than Misa." },
        { id: "sing-better", text: "She sings better than Tom." },
      ],
    },
    {
      id: "which-comparative",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "Which A or B",
      description: "理解 Which ... A or B? 是在比较两个对象。",
      explanations: ["想询问两个对象中哪个更……时，使用 Which is + 比较级, A or B?。", "Which 表示“哪一个”，or 连接两个比较对象。"],
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
  learningGoal: "理解最高级表示三个或更多对象中最……，并掌握 the、of、in 和 Which 句型。",
  minimumQuestions: 12,
  targetAccuracy: 90,
  patterns: [
    {
      id: "superlative-form",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "最高级基本形式",
      description: "识别 tallest、fastest 等最高级形式。",
      explanations: ["最高级表示三个或更多对象中“最……”。", "短词通常加 -est，例如 tall → tallest、fast → fastest。"],
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
      explanations: ["最高级前通常使用 the。", "例如 Tom is the tallest。"],
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
      explanations: ["of 用于表示一定数量或集合中的人或物。", "例如 the tallest of the three、the most interesting of all。"],
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
      explanations: ["in 用于表示地点、班级、家庭等范围。", "例如 the fastest in my class、the tallest in the class。"],
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
      explanations: ["询问范围中“哪一个最……”时，使用 Which + 名词 + is + the + 最高级?。", "例如 Which animal is the strongest?。"],
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
  learningGoal: "掌握比较级和最高级的全部常见词形变化，并逐项完成核心词 Coverage。",
  minimumQuestions: 24,
  targetAccuracy: 90,
  patterns: [
    {
      id: "regular",
      knowledgeId: "comparative",
      subtopicId: "form-change",
      name: "普通变化",
      description: "一般情况下直接加 -er / -est。",
      explanations: ["一般情况下直接加 -er 和 -est。", "例如 long → longer → longest。"],
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
      explanations: ["以 e 结尾时只加 -r 和 -st，不能写成 largeer。", "例如 large → larger → largest。"],
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
      explanations: ["辅音字母 + y 结尾时，先把 y 改成 i，再加 -er、-est。", "例如 happy → happier → happiest。", "这是需要重点练习的 Pattern。"],
      notes: ["如果错误率较高，应主动增加 y-ending 的题量。"],
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
      explanations: ["符合条件的短词先双写最后一个辅音，再加 -er、-est。", "例如 big → bigger → biggest、hot → hotter → hottest。"],
      notes: ["重点核对是否双写最后一个辅音字母。"],
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
      explanations: ["较长或特殊词不使用 -er/-est，而使用 more/most。", "例如 popular → more popular → most popular。", "不要写成 popularer；普通短词仍使用 taller，而不是 more tall。"],
      notes: ["注意区分 more/most 和普通 -er/-est。"],
      required: true,
      minimumQuestions: 4,
      coverageItems: ["popular", "useful", "famous", "difficult", "important", "interesting", "beautiful", "expensive", "slowly", "quickly"],
      examples: [
        { id: "popular-forms", text: "popular → more popular → most popular", base: "popular", comparative: "more popular", superlative: "most popular", coverageItemId: "popular" },
        { id: "useful-forms", text: "useful → more useful → most useful", base: "useful", comparative: "more useful", superlative: "most useful", coverageItemId: "useful" },
        { id: "famous-forms", text: "famous → more famous → most famous", base: "famous", comparative: "more famous", superlative: "most famous", coverageItemId: "famous" },
        { id: "difficult-forms", text: "difficult → more difficult → most difficult", base: "difficult", comparative: "more difficult", superlative: "most difficult", coverageItemId: "difficult" },
        { id: "important-forms", text: "important → more important → most important", base: "important", comparative: "more important", superlative: "most important", coverageItemId: "important" },
        { id: "interesting-forms", text: "interesting → more interesting → most interesting", base: "interesting", comparative: "more interesting", superlative: "most interesting", coverageItemId: "interesting" },
        { id: "beautiful-forms", text: "beautiful → more beautiful → most beautiful", base: "beautiful", comparative: "more beautiful", superlative: "most beautiful", coverageItemId: "beautiful" },
        { id: "expensive-forms", text: "expensive → more expensive → most expensive", base: "expensive", comparative: "more expensive", superlative: "most expensive", coverageItemId: "expensive" },
        { id: "slowly-forms", text: "slowly → more slowly → most slowly", base: "slowly", comparative: "more slowly", superlative: "most slowly", coverageItemId: "slowly" },
        { id: "quickly-forms", text: "quickly → more quickly → most quickly", base: "quickly", comparative: "more quickly", superlative: "most quickly", coverageItemId: "quickly" },
      ],
    },
    {
      id: "irregular",
      knowledgeId: "comparative",
      subtopicId: "form-change",
      name: "不规则变化",
      description: "核心不规则形式必须逐词覆盖，覆盖不等于掌握。",
      explanations: ["不规则变化需要逐词记忆，不能按普通规则推导。", "good/well → better → best；bad → worse → worst；little → less → least；many/much → more → most。"],
      notes: ["每个核心词必须单独覆盖，覆盖一次不等于掌握。"],
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
  learningGoal: "理解 as...as 表示和……一样，not as...as 表示没有……那么。",
  minimumQuestions: 9,
  targetAccuracy: 90,
  patterns: [
    {
      id: "as-as",
      knowledgeId: "comparative",
      subtopicId: "as-as",
      name: "as...as",
      description: "as + 形容词/副词 + as 表示和……一样……。",
      explanations: ["as + 形容词/副词原级 + as 表示“和……一样……”。", "中间必须使用原级，不能写成 as bigger as。"],
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
      explanations: ["not as + 形容词/副词原级 + as 表示“没有……那么……”。", "例如 I am not as tall as Penny。"],
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
