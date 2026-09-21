import assert from "node:assert/strict";
import test from "node:test";

import {
  comparativeKnowledge,
  getKnowledge,
  getKnowledgeRule,
} from "@/data/knowledge/comparative";

test("Comparative 是单一 Knowledge，五个 subtopic 不再是独立 Level", () => {
  assert.equal(comparativeKnowledge.id, "comparative");
  assert.equal(getKnowledge("comparative"), comparativeKnowledge);
  assert.deepEqual(
    comparativeKnowledge.subtopics.map((subtopic) => subtopic.id),
    ["regular", "e-ending", "y-ending", "double-consonant", "irregular"],
  );
});

test("每个 subtopic 都有对应规则和示例", () => {
  for (const subtopic of comparativeKnowledge.subtopics) {
    const rule = getKnowledgeRule(comparativeKnowledge, subtopic.id);
    assert.ok(rule);
    assert.ok(rule.examples.length > 0);
  }
});
