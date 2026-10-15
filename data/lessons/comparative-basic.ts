import type {
  ComicLesson,
  ComicPanel,
  UnderstandingCheckQuestion,
} from "@/types/agent";

function panel(input: ComicPanel): ComicPanel {
  return input;
}

function publishedComic(
  id: string,
  altText: string,
  panels: ComicPanel[],
): ComicLesson {
  return { id, status: "published", altText, panels };
}

export const comparativeFormComic = publishedComic(
  "comparative-form-comic-v1",
  "Height chart showing tall to taller and fast to faster.",
  [
    panel({
      id: "comparative-form-intro",
      order: 1,
      imageUrl: "/comic/01-lesson082-p1.png",
      purpose: "通过高矮和快慢的对比理解比较级 -er。",
      sceneDescription: "Tom 和 Ken 在校园里比较身高与跑步速度。",
      narration: "Short words often add -er to show a comparison.",
      dialogue: [
        {
          characterId: "tom",
          characterName: "Tom",
          text: "tall → taller",
          translation: "高 → 更高",
          emotion: "clear",
        },
        {
          characterId: "ken",
          characterName: "Ken",
          text: "fast → faster",
          translation: "快 → 更快",
          emotion: "clear",
        },
      ],
      focusText: ["taller", "faster"],
      teacherNote: "先建立原级到比较级的关系，不要求机械背诵。",
      altText: "A comic showing tall to taller and fast to faster.",
    }),
  ],
);

export const comparativeThanComic = publishedComic(
  "comparative-than-comic-v1",
  "A running scene showing faster than Misa.",
  [
    panel({
      id: "comparative-than-runner",
      order: 1,
      imageUrl: "/comic/02-lesson082-p2.png",
      purpose: "理解 than 用来引出比较对象。",
      sceneDescription: "Misa 和 Tom 在操场上赛跑，Misa 跑得更快。",
      narration: "than Misa tells us who the speaker is compared with.",
      dialogue: [
        {
          characterId: "misa",
          characterName: "Misa",
          text: "I run faster than Tom.",
          translation: "我跑得比 Tom 快。",
          emotion: "confident",
        },
      ],
      focusText: ["faster than Tom", "than"],
      teacherNote: "强调 than 后面是比较对象 Tom。",
      altText: "Misa runs faster than Tom in a school playground.",
    }),
  ],
);

export const comparativeBeComic = publishedComic(
  "comparative-be-comic-v1",
  "Two scenes using be plus comparative plus than.",
  [
    panel({
      id: "comparative-be-height",
      order: 1,
      imageUrl: "/comic/03-comparative-be-p1.png",
      purpose: "掌握 A + be + 比较级 + than + B。",
      sceneDescription: "Tom 和 Ken 站在身高墙前比较身高。",
      narration: "Use be before the comparative in this sentence pattern.",
      dialogue: [
        {
          characterId: "tom",
          characterName: "Tom",
          text: "I am taller than Ken.",
          translation: "我比 Ken 高。",
          emotion: "proud",
        },
      ],
      focusText: ["am taller than", "be + 比较级"],
      altText: "Tom is taller than Ken beside a height chart.",
    }),
    panel({
      id: "comparative-be-dog",
      order: 2,
      imageUrl: "/comic/04-comparative-be-p2.png",
      purpose: "在 be 动词句中识别比较对象。",
      sceneDescription: "两个孩子在公园里比较各自的狗。",
      narration: "The comparison still uses than to introduce the other object.",
      dialogue: [
        {
          characterId: "amy",
          characterName: "Amy",
          text: "My dog is bigger than yours.",
          translation: "我的狗比你的狗大。",
          emotion: "happy",
        },
      ],
      focusText: ["is bigger than yours"],
      altText: "One dog is bigger than the other dog in a park.",
    }),
  ],
);

export const comparativeActionComic = publishedComic(
  "comparative-action-comic-v1",
  "Action verb comparatives using faster and better.",
  [
    panel({
      id: "comparative-action-run",
      order: 1,
      imageUrl: "/comic/05-comparative-action-p1.png",
      purpose: "理解行为动词后可接比较级，例如 run faster。",
      sceneDescription: "Misa 和 Tom 赛跑，Misa 跑得更快。",
      narration: "The comparative can follow an action verb.",
      dialogue: [
        {
          characterId: "misa",
          characterName: "Misa",
          text: "I run faster than Tom.",
          translation: "我跑得比 Tom 快。",
          emotion: "confident",
        },
      ],
      focusText: ["run faster", "than Tom"],
      altText: "Misa runs faster than Tom.",
    }),
    panel({
      id: "comparative-action-sing",
      order: 2,
      imageUrl: "/comic/06-comparative-action-p2.png",
      purpose: "理解 well 的比较级是 better，并放在行为动词后。",
      sceneDescription: "两个孩子在音乐教室里比较唱歌表现。",
      narration: "well becomes better, and better follows the action verb sing.",
      dialogue: [
        {
          characterId: "lily",
          characterName: "Lily",
          text: "She sings better than Tom.",
          translation: "她唱得比 Tom 好。",
          emotion: "happy",
        },
      ],
      focusText: ["sings better", "better than"],
      altText: "A girl sings better than Tom.",
    }),
  ],
);

export const whichComparativeComic = publishedComic(
  "which-comparative-comic-v1",
  "Two-panel Which question comic.",
  [
    panel({
      id: "which-comparative-months",
      order: 1,
      imageUrl: "/comic/07-which-comparative-p1.png",
      purpose: "理解 Which is + 比较级, A or B? 的提问结构。",
      sceneDescription: "孩子们在日历前比较四月和五月。",
      narration: "Use Which when asking about one of two objects.",
      dialogue: [
        {
          characterId: "ben",
          characterName: "Ben",
          text: "Which is longer, April or May?",
          translation: "四月和五月，哪个更长？",
          emotion: "curious",
        },
      ],
      focusText: ["Which is longer", "April or May"],
      altText: "Children compare April and May on a calendar.",
    }),
    panel({
      id: "which-comparative-choice",
      order: 2,
      imageUrl: "/comic/08-which-comparative-p2.png",
      purpose: "使用 or 连接两个比较对象，并给出选择。",
      sceneDescription: "孩子指着两个人询问谁更高。",
      narration: "The two choices are connected with or.",
      dialogue: [
        {
          characterId: "amy",
          characterName: "Amy",
          text: "Which is taller, you or me?",
          translation: "你和我，谁更高？",
          emotion: "curious",
        },
      ],
      focusText: ["Which", "you or me"],
      altText: "A child asks which person is taller.",
    }),
  ],
);

export const comparativeThanUnderstandingCheck: UnderstandingCheckQuestion[] = [
  {
    id: "comparative-than-who",
    type: "choice",
    prompt: "“I run faster than Tom.” 这句话里谁跑得更快？",
    options: ["I", "Tom"],
    answer: "I",
    explanation: "faster than Tom 表示“我”比 Tom 跑得快。",
  },
  {
    id: "comparative-than-blank",
    type: "fill_blank",
    prompt: "补全句子：I run faster ___ Tom.",
    answer: "than",
    explanation: "比较级后面用 than 引出比较对象。",
  },
];
