import type {
  Knowledge,
  Pattern,
  PatternExample,
  Subtopic,
  TeachingContent,
  TeachingExample,
} from "@/types/agent";

function sentence(id: string, text: string): PatternExample {
  return { id, text };
}

function form(
  id: string,
  base: string,
  comparative: string,
  superlative: string,
  coverageItemId = base,
): PatternExample {
  return {
    id,
    text: `${base} → ${comparative} → ${superlative}`,
    base,
    comparative,
    superlative,
    coverageItemId,
  };
}

function teachingExample(
  sentenceText: string,
  translation?: string,
  analysis?: string,
): TeachingExample {
  return { sentence: sentenceText, translation, analysis };
}

function teaching(input: TeachingContent): TeachingContent {
  return input;
}

const comparativeSubtopic: Subtopic = {
  id: "comparative-basic",
  knowledgeId: "comparative",
  name: "普通比较级",
  learningGoal: "理解两个对象之间的比较，并掌握比较级和 than 的基本表达。",
  description: "理解什么是比较级、什么时候使用，以及 A + 比较级 + than + B。",
  minimumQuestions: 10,
  targetAccuracy: 90,
  patterns: [
    {
      id: "comparative-form",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "什么是比较级",
      description: "理解 taller、faster 等词表示两个对象中“更……”。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["tall", "fast", "long"],
      teachingContent: teaching({
        concept: "比较两个对象时，如果想表达更高、更快、更长等意思，需要使用比较级。",
        why: "比较级让你能说出 A 比 B 更……，而不是只描述一个对象。",
        rule: "常见的短形容词或副词通常在原级后加 -er。",
        structure: "原级 → 比较级，例如 tall → taller、fast → faster、long → longer。",
        examples: [
          teachingExample("tall → taller", "高 → 更高", "taller 是 tall 的比较级，不是新单词。"),
          teachingExample("fast → faster", "快 → 更快"),
          teachingExample("long → longer", "长 → 更长"),
        ],
        contrasts: ["tall = 高；taller = 更高"],
        commonMistakes: ["把 tall 和 taller 当成互不相关的单词。", "描述两个对象时仍然使用原级。"],
        practiceHints: ["先判断是不是两个对象在比较，再选择比较级。"],
      }),
      explanations: ["比较级表示两个对象中“更……”。", "短形容词和副词通常加 -er。"],
      examples: [
        form("tall-comparative", "tall", "taller", "tallest", "tall"),
        form("fast-comparative", "fast", "faster", "fastest", "fast"),
        form("long-comparative", "long", "longer", "longest", "long"),
      ],
    },
    {
      id: "comparative-than",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "比较级 + than",
      description: "理解 than 用来引出比较对象。",
      required: true,
      minimumQuestions: 3,
      teachingContent: teaching({
        concept: "比较级后面需要说明“和谁比”时，用 than 引出比较对象。",
        rule: "A + 比较级 + than + B。",
        structure: "Tom is taller than Ken. / I run faster than Misa.",
        examples: [
          teachingExample("Tom is taller than Ken.", "Tom 比 Ken 高。", "than Ken 表示比 Ken。"),
          teachingExample("I run faster than Misa.", "我跑得比 Misa 快。", "than Misa 表示比 Misa。"),
        ],
        usage: ["than 后面跟比较对象。", "比较对象可以是人名、代词或名词。"],
        commonMistakes: ["忘记写 than。", "把 than 后面的比较对象放错。"],
      }),
      examples: [
        sentence("tom-ken", "Tom is taller than Ken."),
        sentence("run-faster", "I run faster than Misa."),
      ],
    },
    {
      id: "comparative-be",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "be + 比较级 + than",
      description: "掌握 be 动词句中的比较级结构。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "be 动词句使用“主语 + be + 比较级 + than + 比较对象”。",
        structure: "A + be + comparative + than + B。",
        examples: [
          teachingExample("Tom is taller than Ken.", "Tom 比 Ken 高。", "is 是 be 动词，taller 是比较级。"),
          teachingExample("My dog is bigger than yours.", "我的狗比你的狗大。", "bigger 是 big 的比较级。"),
        ],
        commonMistakes: ["把 is 和比较级顺序写错。", "忘记 than。"],
      }),
      examples: [
        sentence("tom-taller", "Tom is taller than Ken."),
        sentence("dog-bigger", "My dog is bigger than yours."),
      ],
    },
    {
      id: "comparative-action",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "行为动词 + 比较级 + than",
      description: "掌握行为动词句中比较级修饰动作的程度。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "比较级也可以出现在行为动词后面，表示动作做得更……。",
        structure: "A + verb + comparative + than + B。",
        examples: [
          teachingExample("I run faster than Misa.", "我跑得比 Misa 快。", "faster 比较的是跑得快不快。"),
          teachingExample("She sings better than Tom.", "她唱得比 Tom 好。", "better 是 well 的比较级。"),
        ],
        usage: ["run faster", "sing better", "表示动作的程度。"],
      }),
      examples: [
        sentence("run-faster", "I run faster than Misa."),
        sentence("sing-better", "She sings better than Tom."),
      ],
    },
    {
      id: "which-comparative",
      knowledgeId: "comparative",
      subtopicId: "comparative-basic",
      name: "Which ... A or B",
      description: "使用 Which 询问两个对象中哪一个更……。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "想问两个对象中哪一个更……时，使用 Which ... A or B?。",
        structure: "Which is + comparative, A or B?",
        examples: [
          teachingExample("Which is longer, April or May?", "四月和五月，哪个更长？", "Which 表示哪一个，or 连接两个对象。"),
        ],
        usage: ["Which = 哪一个", "A or B 是两个比较对象。"],
      }),
      examples: [sentence("april-may", "Which is longer, April or May?")],
    },
  ],
};

const superlativeSubtopic: Subtopic = {
  id: "superlative-basic",
  knowledgeId: "comparative",
  name: "最高级",
  learningGoal: "理解三个或更多对象中的“最……”，并掌握 the、of、in。",
  description: "学习最高级的基本意义、the、of、in 和 Which 最高级问句。",
  minimumQuestions: 12,
  targetAccuracy: 90,
  patterns: [
    {
      id: "superlative-form",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "什么是最高级",
      description: "理解比较级用于两个对象，最高级用于三个或更多对象。",
      required: true,
      minimumQuestions: 2,
      coverageItems: ["tall", "fast"],
      teachingContent: teaching({
        concept: "比较三个或三个以上对象，表达其中“最……”时，使用最高级。",
        rule: "常见短词在词尾加 -est。",
        examples: [
          teachingExample("tall → taller → tallest", "高 → 更高 → 最高"),
          teachingExample("fast → faster → fastest", "快 → 更快 → 最快"),
        ],
        contrasts: ["两个对象通常用比较级；三个或更多对象通常用最高级。"],
      }),
      examples: [
        form("tall-superlative", "tall", "taller", "tallest", "tall"),
        form("fast-superlative", "fast", "faster", "fastest", "fast"),
      ],
    },
    {
      id: "superlative-the",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "the + 最高级",
      description: "最高级前通常使用 the。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "最高级前面通常使用 the。",
        structure: "the + superlative",
        examples: [
          teachingExample("Tom is the tallest.", "Tom 是最高的。", "the tallest 是完整表达。"),
        ],
        commonMistakes: ["忘记在最高级前加 the。"],
      }),
      examples: [sentence("tom-tallest", "Tom is the tallest.")],
    },
    {
      id: "superlative-of",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "最高级 + of",
      description: "of 表示一定数量或集合中的比较范围。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "of 用于表示多个对象、人数或重复对象中的比较范围。",
        structure: "the + superlative + of + 数量/集合",
        examples: [
          teachingExample("Tom is the tallest of the three.", "Tom 是三个人中最高的。", "of the three 表示三人范围。"),
          teachingExample("He is the best of all.", "他是所有人中最好的。", "of all 表示全部范围。"),
        ],
        usage: ["of the three", "of the five", "of all"],
      }),
      examples: [
        sentence("three-of", "Tom is the tallest of the three."),
        sentence("best-of-all", "He is the best of all."),
      ],
    },
    {
      id: "superlative-in",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "最高级 + in",
      description: "in 表示地点、班级或家庭等范围。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "in 用于地点、班级、家庭等范围。",
        structure: "the + superlative + in + 地点/范围",
        examples: [
          teachingExample("I run the fastest in my class.", "我在班里跑得最快。", "in my class 是范围。"),
          teachingExample("Tom is the tallest in China.", "Tom 是中国最高的。", "in China 是地点范围。"),
        ],
        contrasts: ["of 常接数量和集合；in 常接地点或组织范围。"],
      }),
      examples: [
        sentence("fastest-class", "I run the fastest in my class."),
        sentence("tallest-china", "Tom is the tallest in China."),
      ],
    },
    {
      id: "which-superlative",
      knowledgeId: "comparative",
      subtopicId: "superlative-basic",
      name: "Which + 最高级",
      description: "询问“哪一个最……”时使用 Which + 最高级。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "询问范围中哪一个最……时，使用 Which + noun + be + the + superlative?",
        structure: "Which + noun + is + the + superlative?",
        examples: [
          teachingExample("Which animal is the strongest?", "哪种动物最强壮？", "Which animal 询问哪一种动物。"),
        ],
      }),
      examples: [sentence("strongest-animal", "Which animal is the strongest?")],
    },
  ],
};

const formRulesSubtopic: Subtopic = {
  id: "comparative-form-rules",
  knowledgeId: "comparative",
  name: "比较级和最高级的变化规则",
  learningGoal: "掌握普通、e 结尾、y 结尾、双写、不规则和规则选择。",
  description: "系统学习所有词形变化规则，并逐项完成 Pattern Coverage。",
  minimumQuestions: 24,
  targetAccuracy: 90,
  patterns: [
    {
      id: "regular",
      knowledgeId: "comparative",
      subtopicId: "comparative-form-rules",
      name: "普通变化",
      description: "一般情况下加 -er / -est。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["long", "tall", "fast"],
      teachingContent: teaching({
        concept: "一般较短的形容词和副词直接在词尾加 -er / -est。",
        structure: "long → longer → longest",
        examples: [
          teachingExample("tall → taller → tallest"),
          teachingExample("fast → faster → fastest"),
          teachingExample("long → longer → longest"),
        ],
      }),
      examples: [
        form("long-forms", "long", "longer", "longest", "long"),
        form("tall-forms", "tall", "taller", "tallest", "tall"),
        form("fast-forms", "fast", "faster", "fastest", "fast"),
      ],
    },
    {
      id: "e-ending",
      knowledgeId: "comparative",
      subtopicId: "comparative-form-rules",
      name: "e 结尾",
      description: "以 e 结尾时只加 -r / -st。",
      required: true,
      minimumQuestions: 2,
      coverageItems: ["large", "nice"],
      teachingContent: teaching({
        concept: "单词已经以 e 结尾时，不再重复写 e。",
        rule: "只加 r / st。",
        examples: [
          teachingExample("large → larger → largest", "不要写 largeer / largeest。"),
          teachingExample("nice → nicer → nicest"),
        ],
        commonMistakes: ["largeer ❌", "largeest ❌"],
      }),
      examples: [
        form("large-forms", "large", "larger", "largest", "large"),
        form("nice-forms", "nice", "nicer", "nicest", "nice"),
      ],
    },
    {
      id: "y-ending",
      knowledgeId: "comparative",
      subtopicId: "comparative-form-rules",
      name: "辅音字母 + y",
      description: "y 改 i，再加 -er / -est。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["busy", "easy", "early", "happy"],
      teachingContent: teaching({
        concept: "辅音字母 + y 结尾时，先把 y 改成 i，再加 -er / -est。",
        rule: "y → i + er / est。",
        examples: [
          teachingExample("busy → busier → busiest", "忙碌的 → 更忙 → 最忙"),
          teachingExample("easy → easier → easiest"),
          teachingExample("early → earlier → earliest"),
          teachingExample("happy → happier → happiest"),
        ],
        commonMistakes: ["easyer ❌", "happyer ❌"],
      }),
      examples: [
        form("busy-forms", "busy", "busier", "busiest", "busy"),
        form("easy-forms", "easy", "easier", "easiest", "easy"),
        form("early-forms", "early", "earlier", "earliest", "early"),
        form("happy-forms", "happy", "happier", "happiest", "happy"),
      ],
    },
    {
      id: "double-consonant",
      knowledgeId: "comparative",
      subtopicId: "comparative-form-rules",
      name: "双写最后一个辅音字母",
      description: "先双写最后辅音，再加 -er / -est。",
      required: true,
      minimumQuestions: 2,
      coverageItems: ["big", "hot"],
      teachingContent: teaching({
        concept: "符合教材所讲短词条件时，先双写最后一个辅音字母。",
        rule: "双写 + er / est。",
        examples: [
          teachingExample("big → bigger → biggest", "不要写 biger。"),
          teachingExample("hot → hotter → hottest", "不要写 hoter。"),
        ],
        commonMistakes: ["biger ❌", "hoter ❌"],
      }),
      examples: [
        form("big-forms", "big", "bigger", "biggest", "big"),
        form("hot-forms", "hot", "hotter", "hottest", "hot"),
      ],
    },
    {
      id: "irregular",
      knowledgeId: "comparative",
      subtopicId: "comparative-form-rules",
      name: "不规则变化",
      description: "核心不规则形式必须逐词覆盖。",
      required: true,
      minimumQuestions: 6,
      coverageItems: ["good", "well", "many", "much", "bad", "little"],
      teachingContent: teaching({
        concept: "有些词不能按普通规则推导，必须单独记忆。",
        examples: [
          teachingExample("good → better → best"),
          teachingExample("well → better → best"),
          teachingExample("many → more → most"),
          teachingExample("much → more → most"),
          teachingExample("bad → worse → worst"),
          teachingExample("little → less → least"),
        ],
        commonMistakes: ["gooder ❌", "manyer ❌"],
        practiceHints: ["每个不规则词都要单独覆盖和复习。"],
      }),
      examples: [
        form("good-forms", "good", "better", "best", "good"),
        form("well-forms", "well", "better", "best", "well"),
        form("many-forms", "many", "more", "most", "many"),
        form("much-forms", "much", "more", "most", "much"),
        form("bad-forms", "bad", "worse", "worst", "bad"),
        form("little-forms", "little", "less", "least", "little"),
      ],
    },
    {
      id: "rule-selection",
      knowledgeId: "comparative",
      subtopicId: "comparative-form-rules",
      name: "规则选择",
      description: "根据单词特点选择正确变化规则。",
      required: true,
      minimumQuestions: 3,
      teachingContent: teaching({
        concept: "掌握规则不仅是记住结果，还要知道为什么这样变化。",
        usage: ["普通词加 er/est", "e 结尾加 r/st", "y → i", "短词双写", "不规则单独记", "长词使用 more/most"],
        examples: [
          teachingExample("long → longer → longest", "普通变化"),
          teachingExample("large → larger → largest", "e 结尾"),
          teachingExample("happy → happier → happiest", "y 结尾"),
          teachingExample("hot → hotter → hottest", "双写"),
          teachingExample("good → better → best", "不规则"),
        ],
      }),
      examples: [
        form("rule-long", "long", "longer", "longest", "long"),
        form("rule-large", "large", "larger", "largest", "large"),
        form("rule-happy", "happy", "happier", "happiest", "happy"),
        form("rule-hot", "hot", "hotter", "hottest", "hot"),
        form("rule-good", "good", "better", "best", "good"),
      ],
    },
  ],
};

const moreMostSubtopic: Subtopic = {
  id: "comparative-more-most",
  knowledgeId: "comparative",
  name: "more / most",
  learningGoal: "掌握常见长词使用 more / most，并会与 -er / -est 规则区分。",
  description: "学习 more + 原级、most + 原级，以及常见错误对比。",
  minimumQuestions: 12,
  targetAccuracy: 90,
  patterns: [
    {
      id: "more-most",
      knowledgeId: "comparative",
      subtopicId: "comparative-more-most",
      name: "more / most + 原级",
      description: "较长词语使用 more / most，而不是加 -er / -est。",
      required: true,
      minimumQuestions: 4,
      coverageItems: ["popular", "famous", "difficult", "important", "interesting", "useful", "beautiful", "expensive"],
      teachingContent: teaching({
        concept: "有些较长的词不能直接加 -er / -est，而使用 more / most + 原级。",
        structure: "more + adjective；most + adjective",
        examples: [
          teachingExample("popular → more popular → most popular"),
          teachingExample("famous → more famous → most famous"),
          teachingExample("difficult → more difficult → most difficult"),
          teachingExample("important → more important → most important"),
          teachingExample("interesting → more interesting → most interesting"),
          teachingExample("useful → more useful → most useful"),
          teachingExample("beautiful → more beautiful → most beautiful"),
          teachingExample("expensive → more expensive → most expensive"),
        ],
        commonMistakes: ["popularer ❌", "most popular ✅"],
      }),
      examples: [
        form("popular-forms", "popular", "more popular", "most popular", "popular"),
        form("famous-forms", "famous", "more famous", "most famous", "famous"),
        form("difficult-forms", "difficult", "more difficult", "most difficult", "difficult"),
        form("important-forms", "important", "more important", "most important", "important"),
        form("interesting-forms", "interesting", "more interesting", "most interesting", "interesting"),
        form("useful-forms", "useful", "more useful", "most useful", "useful"),
        form("beautiful-forms", "beautiful", "more beautiful", "most beautiful", "beautiful"),
        form("expensive-forms", "expensive", "more expensive", "most expensive", "expensive"),
      ],
    },
    {
      id: "more-most-judgment",
      knowledgeId: "comparative",
      subtopicId: "comparative-more-most",
      name: "more / most 与 -er / -est 的判断",
      description: "根据单词选择 more / most 或 -er / -est。",
      required: true,
      minimumQuestions: 3,
      teachingContent: teaching({
        concept: "判断单词该用 more / most 还是 -er / -est。",
        contrasts: [
          "tall → taller → tallest",
          "popular → more popular → most popular",
          "more tall ❌；most tall ❌",
        ],
        examples: [
          teachingExample("taller ✅", "普通短词使用 -er。"),
          teachingExample("more popular ✅", "较长词使用 more。"),
        ],
        commonMistakes: ["more tall ❌", "most tall ❌", "popularer ❌"],
      }),
      examples: [
        form("tall-choice", "tall", "taller", "tallest", "tall"),
        form("popular-choice", "popular", "more popular", "most popular", "popular"),
      ],
    },
  ],
};

const asAsSubtopic: Subtopic = {
  id: "comparative-as-as",
  knowledgeId: "comparative",
  name: "as ... as / not as ... as",
  learningGoal: "理解同级比较和否定同级比较，使用原级而不是比较级。",
  description: "学习 as + 原级 + as，以及 not as + 原级 + as。",
  minimumQuestions: 9,
  targetAccuracy: 90,
  patterns: [
    {
      id: "as-as",
      knowledgeId: "comparative",
      subtopicId: "comparative-as-as",
      name: "as ... as",
      description: "表示“和……一样……”。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["big", "tall", "fast"],
      teachingContent: teaching({
        concept: "as ... as 表示两个对象“一样……”。",
        structure: "A + be + as + adjective/adverb + as + B",
        examples: [
          teachingExample("My dog is as big as yours.", "我的狗和你的狗一样大。"),
          teachingExample("Tom is as tall as Ken.", "Tom 和 Ken 一样高。"),
        ],
      }),
      examples: [
        sentence("dog-as-big", "My dog is as big as yours."),
        sentence("tom-as-tall", "Tom is as tall as Ken."),
        sentence("run-as-fast", "I run as fast as Misa."),
      ],
    },
    {
      id: "not-as-as",
      knowledgeId: "comparative",
      subtopicId: "comparative-as-as",
      name: "not as ... as",
      description: "表示“没有……那么……”。",
      required: true,
      minimumQuestions: 3,
      coverageItems: ["tall", "big", "fast"],
      teachingContent: teaching({
        concept: "not as ... as 表示“没有……那么……”。",
        structure: "A + be + not as + adjective/adverb + as + B",
        examples: [
          teachingExample("I'm not as tall as Penny.", "我没有 Penny 那么高。"),
          teachingExample("This box is not as big as that one.", "这个盒子没有那个盒子那么大。"),
        ],
      }),
      examples: [
        sentence("not-tall", "I'm not as tall as Penny."),
        sentence("not-big", "This box is not as big as that one."),
        sentence("not-fast", "I don't run as fast as Misa."),
      ],
    },
    {
      id: "as-as-base-form",
      knowledgeId: "comparative",
      subtopicId: "comparative-as-as",
      name: "as ... as 中使用原级",
      description: "as 和 as 之间必须使用原级。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "as ... as 中间使用形容词或副词原级。",
        examples: [
          teachingExample("as big as", "和……一样大"),
          teachingExample("as fast as", "和……一样快"),
        ],
        contrasts: ["as big as ✅", "as bigger as ❌"],
        commonMistakes: ["as bigger as ❌", "as faster as ❌"],
      }),
      examples: [
        sentence("as-big-base", "as big as"),
        sentence("as-fast-base", "as fast as"),
      ],
    },
    {
      id: "not-meaning",
      knowledgeId: "comparative",
      subtopicId: "comparative-as-as",
      name: "not 的意义",
      description: "区分同级比较和否定同级比较。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "not 会改变整个比较关系。",
        examples: [
          teachingExample("I am as tall as Tom.", "我和 Tom 一样高。"),
          teachingExample("I am not as tall as Tom.", "我没有 Tom 那么高。"),
        ],
        contrasts: [
          "I am as tall as Tom. = 我和 Tom 一样高。",
          "I am not as tall as Tom. = 我没有 Tom 那么高。",
        ],
      }),
      examples: [
        sentence("as-tall-tom", "I am as tall as Tom."),
        sentence("not-as-tall-tom", "I am not as tall as Tom."),
      ],
    },
  ],
};

const sentenceApplicationSubtopic: Subtopic = {
  id: "comparative-sentence-application",
  knowledgeId: "comparative",
  name: "比较句型综合应用",
  learningGoal: "综合判断和运用比较级、最高级、同级比较和 Which 问句。",
  description: "不教大量新规则，重点训练在句子中选对句型。",
  minimumQuestions: 12,
  targetAccuracy: 90,
  patterns: [
    {
      id: "application-comparative",
      knowledgeId: "comparative",
      subtopicId: "comparative-sentence-application",
      name: "比较级句型",
      description: "识别和使用 A is taller than B。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "两个对象比较时使用比较级 + than。",
        examples: [
          teachingExample("A is taller than B.", "A 比 B 高。"),
          teachingExample("A runs faster than B.", "A 跑得比 B 快。"),
        ],
      }),
      examples: [
        sentence("app-comparative-be", "A is taller than B."),
        sentence("app-comparative-action", "A runs faster than B."),
      ],
    },
    {
      id: "application-superlative",
      knowledgeId: "comparative",
      subtopicId: "comparative-sentence-application",
      name: "最高级句型",
      description: "识别和使用 the + 最高级 + of/in。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "三个或更多对象中“最……”使用 the + 最高级。",
        examples: [
          teachingExample("A is the tallest of the three."),
          teachingExample("A is the fastest in my class."),
        ],
      }),
      examples: [
        sentence("app-superlative-of", "A is the tallest of the three."),
        sentence("app-superlative-in", "A is the fastest in my class."),
      ],
    },
    {
      id: "application-as-as",
      knowledgeId: "comparative",
      subtopicId: "comparative-sentence-application",
      name: "同级比较句型",
      description: "识别和使用 as ... as。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "两个对象一样……时使用 as ... as。",
        examples: [teachingExample("A is as big as B.")],
      }),
      examples: [sentence("app-as-as", "A is as big as B.")],
    },
    {
      id: "application-not-as-as",
      knowledgeId: "comparative",
      subtopicId: "comparative-sentence-application",
      name: "否定同级比较",
      description: "识别和使用 not as ... as。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "没有……那么……时使用 not as ... as。",
        examples: [teachingExample("A is not as big as B.")],
      }),
      examples: [sentence("app-not-as-as", "A is not as big as B.")],
    },
    {
      id: "application-which-comparative",
      knowledgeId: "comparative",
      subtopicId: "comparative-sentence-application",
      name: "Which 两者比较",
      description: "识别 Which ... A or B?。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "询问两个对象中哪个更……时使用 Which ... A or B?。",
        examples: [teachingExample("Which is longer, A or B?")],
      }),
      examples: [sentence("app-which-comparative", "Which is longer, A or B?")],
    },
    {
      id: "application-which-superlative",
      knowledgeId: "comparative",
      subtopicId: "comparative-sentence-application",
      name: "Which 最高级",
      description: "识别 Which ... is the + 最高级?。",
      required: true,
      minimumQuestions: 2,
      teachingContent: teaching({
        concept: "询问范围中哪个最……时使用 Which ... is the + 最高级?。",
        examples: [teachingExample("Which animal is the strongest?")],
      }),
      examples: [sentence("app-which-superlative", "Which animal is the strongest?")],
    },
  ],
};

export const comparativeKnowledge: Knowledge = {
  id: "comparative",
  title: "比较级",
  description: "从普通比较级、最高级、变化规则、more/most、同级比较到综合应用，逐步掌握比较表达。",
  subtopics: [
    comparativeSubtopic,
    superlativeSubtopic,
    formRulesSubtopic,
    moreMostSubtopic,
    asAsSubtopic,
    sentenceApplicationSubtopic,
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
