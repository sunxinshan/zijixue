import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  comparativeKnowledge,
  getSubtopic,
} from "@/data/knowledge/comparative";
import {
  evaluateUnderstandingAnswer,
  getInitialTeachingMode,
  getPublishedComicPanels,
} from "@/lib/pattern-lesson";
import type { TeachingContent, UnderstandingCheckQuestion } from "@/types/agent";

test("普通比较级的所有 Pattern 都接入已发布漫画", () => {
  const subtopic = getSubtopic(comparativeKnowledge, "comparative-basic");
  assert.ok(subtopic);
  const expectedPanels: Record<string, number> = {
    "comparative-form": 1,
    "comparative-than": 1,
    "comparative-be": 2,
    "comparative-action": 2,
    "which-comparative": 2,
  };

  for (const pattern of subtopic.patterns) {
    const panels = getPublishedComicPanels(pattern.teachingContent);
    assert.equal(panels.length, expectedPanels[pattern.id], pattern.id);
    assert.equal(getInitialTeachingMode(pattern.teachingContent), "comic");

    for (const panel of panels) {
      assert.ok(panel.imageUrl.startsWith("/comic/"));
      assert.ok(
        existsSync(path.join(process.cwd(), "public", panel.imageUrl.slice(1))),
      );
    }
  }
});

test("漫画旁白使用中文", () => {
  const subtopic = getSubtopic(comparativeKnowledge, "comparative-basic");
  assert.ok(subtopic);

  for (const pattern of subtopic.patterns) {
    for (const panel of getPublishedComicPanels(pattern.teachingContent)) {
      assert.ok(panel.narration, `${pattern.id} panel narration missing`);
      assert.match(panel.narration, /[\u4e00-\u9fff]/);
    }
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
    prompt: "谁跑得更快？",
    options: ["I", "Tom"],
    answer: "I",
    explanation: "I 跑得更快。",
  };
  const fillBlank: UnderstandingCheckQuestion = {
    id: "blank",
    type: "fill_blank",
    prompt: "I run faster ___ Tom.",
    answer: "than",
    explanation: "使用 than。",
  };

  assert.equal(evaluateUnderstandingAnswer(choice, "i"), true);
  assert.equal(evaluateUnderstandingAnswer(choice, "Tom"), false);
  assert.equal(evaluateUnderstandingAnswer(fillBlank, " THAN "), true);
  assert.equal(evaluateUnderstandingAnswer(fillBlank, "then"), false);
});
