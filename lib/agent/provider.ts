import type { LLMProvider } from "@/lib/agent/llm";
import { createMockLLMProvider } from "@/lib/agent/providers/mock";
import { createOpenAIProvider } from "@/lib/agent/providers/openai";

function resolveProviderName(): string {
  const configured = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (configured) return configured;
  return process.env.LLM_API_KEY ? "openai" : "mock";
}

export function createLLMProvider(): LLMProvider {
  const providerName = resolveProviderName();

  if (providerName === "mock") {
    return createMockLLMProvider();
  }

  if (providerName === "openai" || providerName === "deepseek") {
    const apiKey = process.env.LLM_API_KEY?.trim();
    const model = process.env.LLM_MODEL?.trim();
    if (!apiKey) throw new Error(`LLM_PROVIDER=${providerName} 时必须配置 LLM_API_KEY`);
    if (!model) throw new Error(`LLM_PROVIDER=${providerName} 时必须配置 LLM_MODEL`);

    return createOpenAIProvider({
      apiKey,
      model,
      providerName,
      baseUrl:
        process.env.LLM_BASE_URL?.trim() ||
        (providerName === "deepseek" ? "https://api.deepseek.com/v1" : undefined),
    });
  }

  throw new Error(`不支持的 LLM_PROVIDER：${providerName}`);
}
