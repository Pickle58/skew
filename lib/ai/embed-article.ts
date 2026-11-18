import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";
import { getOpenAIApiKey } from "@/lib/env/server";
import { ANALYSIS_TEXT_CHAR_LIMIT, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/limits";
import { captureAiEmbedding } from "@/lib/posthog-ai";

function toVectorLiteral(values: readonly number[]): string {
  return `[${values.join(",")}]`;
}

export async function embedArticleText(input: {
  title: string;
  rawText: string;
  aiSessionId: string;
  aiTraceId: string;
}): Promise<string> {
  const rawText = input.rawText.slice(0, ANALYSIS_TEXT_CHAR_LIMIT);
  const value = `Title: ${input.title}\n\n${rawText}`;
  const openai = createOpenAI({ apiKey: getOpenAIApiKey() });
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const startedAt = Date.now();
    try {
      const { embedding, usage } = await embed({
        model: openai.embedding(EMBEDDING_MODEL),
        value,
        maxRetries: 0,
      });
      if (embedding.length !== EMBEDDING_DIMENSIONS || embedding.some((item) => !Number.isFinite(item))) {
        throw new Error(`Embedding length ${embedding.length}, expected ${EMBEDDING_DIMENSIONS}`);
      }
      captureAiEmbedding({
        sessionId: input.aiSessionId,
        traceId: input.aiTraceId,
        model: EMBEDDING_MODEL,
        input: value,
        inputTokens: usage.tokens,
        latency: (Date.now() - startedAt) / 1000,
        isError: false,
      });
      return toVectorLiteral(embedding);
    } catch (error) {
      captureAiEmbedding({
        sessionId: input.aiSessionId,
        traceId: input.aiTraceId,
        model: EMBEDDING_MODEL,
        input: value,
        inputTokens: 0,
        latency: (Date.now() - startedAt) / 1000,
        isError: true,
      });
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Embedding failed");
}
