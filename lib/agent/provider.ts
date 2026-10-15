import type { LLMProvider } from "@/lib/agent/llm";
import { createMockLLMProvider } from "@/lib/agent/providers/mock";
import { createOpenAIProvider } from "@/lib/agent/providers/openai";

const DEFAULT_LLM_TIMEOUT_MS = 120_000;

export function getLLMTimeoutMs(): number {
  const configured = Number(process.env.LLM_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1_000
    ? configured
    : DEFAULT_LLM_TIMEOUT_MS;
}

export function withLLMTimeout<T>(
  operation: Promise<T>,
  timeoutMs = getLLMTimeoutMs(),
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`超级大脑模型响应超时（${timeoutMs}ms）`));
    }, timeoutMs);
  });

  return Promise.race([operation, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

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

    const timeoutMs = getLLMTimeoutMs();
    const provider = createOpenAIProvider({
      apiKey,
      model,
      providerName,
      timeoutMs,
      baseUrl:
        process.env.LLM_BASE_URL?.trim() ||
        (providerName === "deepseek" ? "https://api.deepseek.com/v1" : undefined),
    });
    return {
      kind: provider.kind,
      generate: (prompt, schema, context) =>
        withLLMTimeout(
          provider.generate(prompt, schema, context),
          timeoutMs,
        ),
    };
  }

  throw new Error(`不支持的 LLM_PROVIDER：${providerName}`);
}
