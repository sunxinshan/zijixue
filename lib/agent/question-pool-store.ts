import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QuestionPool } from "@/types/agent";

export interface QuestionPoolRepository {
  getPools(knowledgeId: string, subtopicId: string): Promise<QuestionPool[]>;
  savePools(pools: QuestionPool[]): Promise<void>;
}

interface StoredQuestionPools {
  version: 1;
  knowledgeId: string;
  subtopicId: string;
  pools: QuestionPool[];
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function poolKey(knowledgeId: string, subtopicId: string): string {
  return `${safeId(knowledgeId)}__${safeId(subtopicId)}`;
}

export function createFileQuestionPoolRepository(
  directory = process.env.QUESTION_POOL_DIR?.trim() ||
    path.join(process.cwd(), ".data", "question-pools"),
): QuestionPoolRepository {
  const fileFor = (knowledgeId: string, subtopicId: string) =>
    path.join(directory, `${poolKey(knowledgeId, subtopicId)}.json`);

  return {
    async getPools(knowledgeId, subtopicId) {
      try {
        const raw = await readFile(fileFor(knowledgeId, subtopicId), "utf8");
        const parsed = JSON.parse(raw) as Partial<StoredQuestionPools>;
        return Array.isArray(parsed.pools) ? parsed.pools : [];
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return [];
        }
        return [];
      }
    },

    async savePools(pools) {
      if (pools.length === 0) return;
      const { knowledgeId, subtopicId } = pools[0];
      await mkdir(directory, { recursive: true });
      const filePath = fileFor(knowledgeId, subtopicId);
      const existing = await this.getPools(knowledgeId, subtopicId);
      const byPattern = new Map(
        existing.map((pool) => [pool.patternId, pool]),
      );
      for (const pool of pools) byPattern.set(pool.patternId, pool);

      const payload: StoredQuestionPools = {
        version: 1,
        knowledgeId,
        subtopicId,
        pools: Array.from(byPattern.values()),
      };
      const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
      await rename(tempPath, filePath);
    },
  };
}

export function createMemoryQuestionPoolRepository(
  initial: QuestionPool[] = [],
): QuestionPoolRepository & { data: QuestionPool[] } {
  const data = [...initial];
  return {
    data,
    async getPools(knowledgeId, subtopicId) {
      return data.filter(
        (pool) =>
          pool.knowledgeId === knowledgeId && pool.subtopicId === subtopicId,
      );
    },
    async savePools(pools) {
      for (const pool of pools) {
        const index = data.findIndex(
          (item) => item.id === pool.id || item.patternId === pool.patternId,
        );
        if (index >= 0) data[index] = pool;
        else data.push(pool);
      }
    },
  };
}
