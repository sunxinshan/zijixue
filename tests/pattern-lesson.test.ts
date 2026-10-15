import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { comparativeKnowledge, getPattern } from "@/data/knowledge/comparative";
import {
  evaluateUnderstandingAnswer,
  getInitialTeachingMode,
  getPublishedComicPanels,
} from "@/lib/pattern-lesson";
import type { TeachingContent, UnderstandingCheckQuestion } from "@/types/agent";

test("comparative-than 使用两张已发布漫画和静态图片", () => {
  const pattern = getPattern(comparativeKnowledge, "comparative-than");
  assert.ok(pattern);

  const panels = getPublishedComicPanels(pattern.teachingContent);
  assert.equal(panels.length, 2);
  assert.equal(getInitialTeachingMode(pattern.teachingContent), "comic");
  assert.deepEqual(
    panels.map((panel) => panel.order),
    [1, 2],
  );

  for (const panel of panels) {
    assert.ok(panel.imageUrl.startsWith("/comic/"));
    assert.ok(
      existsSync(path.join(process.cwd(), "public", panel.imageUrl.slice(1))),
    );
  }
});

test("没有已发布漫画时默认使用文字讲解", () => {
  const content: TeachingContent = {
    concept: "测试概念",
    examples: [{ sentence: "Test.", translation: "测试。" }],
  };
  assert.equal(getInitialTeachingMode(content), "text");
  assert.deepEqual(getPublishedComicPanels(content), []);
});

test("草稿状态的漫画不会作为默认讲解", () => {
  const content: TeachingContent = {
    concept: "测试概念",
    examples: [{ sentence: "Test." }],
    comic: {
      id: "draft-comic",
      status: "draft",
      altText: "draft",
      panels: [
        {
          id: "draft-panel",
          order: 1,
          imageUrl: "/comic/draft.png",
          purpose: "测试",
          sceneDescription: "测试",
          dialogue: [],
          altText: "draft",
        },
      ],
    },
  };

  assert.equal(getInitialTeachingMode(content), "text");
});

test("理解检查使用本地判分且不要求大小写一致", () => {
  const choice: UnderstandingCheckQuestion = {
    id: "choice",
    type: "choice",
    prompt: "谁更高？",
    options: ["Tom", "Ken"],
    answer: "Tom",
    explanation: "Tom 更高。",
  };
  const fillBlank: UnderstandingCheckQuestion = {
    id: "blank",
    type: "fill_blank",
    prompt: "Tom is taller ___ Ken.",
    answer: "than",
    explanation: "使用 than。",
  };

  assert.equal(evaluateUnderstandingAnswer(choice, "tom"), true);
  assert.equal(evaluateUnderstandingAnswer(choice, "Ken"), false);
  assert.equal(evaluateUnderstandingAnswer(fillBlank, " THAN "), true);
  assert.equal(evaluateUnderstandingAnswer(fillBlank, "then"), false);
});
