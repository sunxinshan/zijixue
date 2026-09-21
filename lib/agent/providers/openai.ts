import { ChatOpenAI } from "@langchain/openai";
import type { z } from "zod";

import type { LLMProvider } from "@/lib/agent/llm";

export interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  providerName?: string;
}

export function createOpenAIProvider(config: OpenAIProviderConfig): LLMProvider {
  const model = new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    maxRetries: 2,
    configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
  });

  return {
    kind: config.providerName ?? "openai",
    async generate<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
      const structuredModel = model.withStructuredOutput(schema, {
        name: "english_forest_response",
        method: config.providerName === "deepseek" ? "jsonMode" : "functionCalling",
      });
      const result = await structuredModel.invoke(prompt);
      return result as T;
    },
  };
}
