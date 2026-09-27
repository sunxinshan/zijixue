import assert from "node:assert/strict";
import test from "node:test";

import {
  comparativeKnowledge,
  getKnowledge,
  getPattern,
  getSubtopic,
} from "@/data/knowledge/comparative";

test("Comparative Knowledge 包含四个 Subtopic", () => {
  assert.equal(getKnowledge("comparative"), comparativeKnowledge);
  assert.deepEqual(
    comparativeKnowledge.subtopics.map((subtopic) => subtopic.id),
    ["comparative-basic", "superlative-basic", "form-change", "as-as"],
  );
});

test("form-change 包含六个 Pattern", () => {
  const subtopic = getSubtopic(comparativeKnowledge, "form-change");
  assert.ok(subtopic);
  assert.deepEqual(
    subtopic.patterns.map((pattern) => pattern.id),
    ["regular", "e-ending", "y-ending", "double-consonant", "more-most", "irregular"],
  );
});

test("irregular Pattern 定义逐词 Coverage", () => {
  const pattern = getPattern(comparativeKnowledge, "irregular");
  assert.ok(pattern);
  assert.deepEqual(pattern.coverageItems, [
    "good",
    "well",
    "bad",
    "little",
    "many",
    "much",
  ]);
});
