import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QuestionBatch } from "@/types/agent";

export interface BaselineQuestionStore {
  get(knowledgeId: string): Promise<QuestionBatch | null>;
  save(knowledgeId: string, batch: QuestionBatch): Promise<void>;
}

interface StoredBaseline {
  version: 1;
  knowledgeId: string;
  generatedAt: number;
  questions: QuestionBatch["questions"];
}

function safeKnowledgeId(knowledgeId: string): string {
  return knowledgeId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function createFileBaselineStore(
  directory = process.env.BASELINE_STORAGE_DIR?.trim() ||
    path.join(process.cwd(), ".data", "baselines"),
): BaselineQuestionStore {
  const fileFor = (knowledgeId: string) =>
    path.join(directory, `${safeKnowledgeId(knowledgeId)}.json`);

  return {
    async get(knowledgeId) {
      try {
        const raw = await readFile(fileFor(knowledgeId), "utf8");
        const parsed = JSON.parse(raw) as Partial<StoredBaseline>;
        if (!Array.isArray(parsed.questions)) return null;
        return { questions: parsed.questions };
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return null;
        }
        return null;
      }
    },

    async save(knowledgeId, batch) {
      await mkdir(directory, { recursive: true });
      const filePath = fileFor(knowledgeId);
      const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      const payload: StoredBaseline = {
        version: 1,
        knowledgeId,
        generatedAt: Date.now(),
        questions: batch.questions,
      };
      await writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
      await rename(tempPath, filePath);
    },
  };
}

export function createMemoryBaselineStore(
  initial: Record<string, QuestionBatch> = {},
): BaselineQuestionStore & { data: Record<string, QuestionBatch> } {
  const data = { ...initial };
  return {
    data,
    async get(knowledgeId) {
      return data[knowledgeId] ?? null;
    },
    async save(knowledgeId, batch) {
      data[knowledgeId] = batch;
    },
  };
}
