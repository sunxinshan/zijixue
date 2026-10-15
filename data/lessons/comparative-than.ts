import type {
  ComicLesson,
  UnderstandingCheckQuestion,
} from "@/types/agent";

export const comparativeThanComic: ComicLesson = {
  id: "comparative-than-comic-v1",
  status: "published",
  styleId: "comparative-story-v1",
  altText: "Tom and Ken compare their heights and use taller than.",
  panels: [
    {
      id: "comparative-than-height",
      order: 1,
      imageUrl: "/comic/03-comparative-be-p1.png",
      purpose: "通过身高对比理解 taller 表示“更高”。",
      sceneDescription:
        "Tom 和 Ken 站在学校操场的身高墙前，Tom 明显更高。",
      narration: "Tom and Ken are comparing their heights.",
      dialogue: [
        {
          characterId: "tom",
          characterName: "Tom",
          text: "I am taller!",
          translation: "我更高！",
          emotion: "proud",
        },
      ],
      focusText: ["taller"],
      teacherNote: "先让孩子观察身高差异，不急着解释 than。",
      altText: "Tom is taller than Ken beside a height chart.",
    },
    {
      id: "comparative-than-object",
      order: 2,
      imageUrl: "/comic/04-comparative-be-p2.png",
      purpose: "理解 than 用来引出比较对象，形成完整比较句。",
      sceneDescription:
        "Tom 指向自己，再指向 Ken，说出完整句子。",
      narration: "than Ken tells us who Tom is compared with.",
      dialogue: [
        {
          characterId: "tom",
          characterName: "Tom",
          text: "I am taller than Ken.",
          translation: "我比 Ken 高。",
          emotion: "clear",
        },
      ],
      focusText: ["taller than Ken", "than"],
      teacherNote: "强调 than 后面是拿来比较的对象 Ken。",
      altText: "Tom points to himself and Ken while saying taller than Ken.",
    },
  ],
};

export const comparativeThanUnderstandingCheck: UnderstandingCheckQuestion[] = [
  {
    id: "comparative-than-who",
    type: "choice",
    prompt: "“Tom is taller than Ken.” 这句话里谁更高？",
    options: ["Tom", "Ken"],
    answer: "Tom",
    explanation: "taller than Ken 表示 Tom 比 Ken 高。",
  },
  {
    id: "comparative-than-blank",
    type: "fill_blank",
    prompt: "补全句子：Tom is taller ___ Ken.",
    answer: "than",
    explanation: "比较级后面用 than 引出比较对象。",
  },
];
