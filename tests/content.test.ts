import assert from "node:assert/strict";
import test from "node:test";

import {
  comparativeKnowledge,
  getKnowledge,
  getPattern,
  getSubtopic,
} from "@/data/knowledge/comparative";

test("Comparative Knowledge 包含 Content V3 的六个 Subtopic", () => {
  assert.equal(getKnowledge("comparative"), comparativeKnowledge);
  assert.deepEqual(
    comparativeKnowledge.subtopics.map((subtopic) => subtopic.id),
    [
      "comparative-basic",
      "superlative-basic",
      "comparative-form-rules",
      "comparative-more-most",
      "comparative-as-as",
      "comparative-sentence-application",
    ],
  );
});

test("变化规则 Subtopic 包含六个 Pattern", () => {
  const subtopic = getSubtopic(comparativeKnowledge, "comparative-form-rules");
  assert.ok(subtopic);
  assert.deepEqual(
    subtopic.patterns.map((pattern) => pattern.id),
    ["regular", "e-ending", "y-ending", "double-consonant", "irregular", "rule-selection"],
  );
});

test("irregular Pattern 定义逐词 Coverage", () => {
  const pattern = getPattern(comparativeKnowledge, "irregular");
  assert.ok(pattern);
  assert.deepEqual(pattern.coverageItems, [
    "good",
    "well",
    "many",
    "much",
    "bad",
    "little",
  ]);
});

test("所有 Pattern 都包含真正的 TeachingContent", () => {
  for (const subtopic of comparativeKnowledge.subtopics) {
    for (const pattern of subtopic.patterns) {
      assert.ok(pattern.teachingContent.concept.length > 0);
      assert.ok(pattern.teachingContent.examples.length > 0);
    }
  }
});
