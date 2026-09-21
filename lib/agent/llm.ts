import type { z } from "zod";

export interface LLMProvider {
  readonly kind: string;
  generate<T>(
    prompt: string,
    schema: z.ZodType<T>,
    context?: unknown,
  ): Promise<T>;
}
