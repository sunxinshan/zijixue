import { ChatOpenAI } from "@langchain/openai";
import type { z } from "zod";

import type { LLMProvider } from "@/lib/agent/llm";

export interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  providerName?: string;
  timeoutMs?: number;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

function parseJsonObject<T>(content: unknown): T {
  const text = contentToText(content).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("模型没有返回 JSON 对象");
  }
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export function createOpenAIProvider(config: OpenAIProviderConfig): LLMProvider {
  const model = new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    maxRetries: 1,
    timeout: config.timeoutMs,
    configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
  });

  return {
    kind: config.providerName ?? "openai",
    async generate<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
      if (config.providerName === "deepseek") {
        const response = await model.invoke(prompt);
        return parseJsonObject<T>(response.content);
      }

      const structuredModel = model.withStructuredOutput(schema, {
        name: "english_forest_response",
        method: "functionCalling",
      });
      const result = await structuredModel.invoke(prompt);
      return result as T;
    },
  };
}
