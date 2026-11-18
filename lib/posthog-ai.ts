import "server-only";
import { getPostHogClient } from "@/lib/posthog-server";

type AiCaptureContext = {
  sessionId: string;
  traceId: string;
  model: string;
  input: unknown;
  inputTokens: number;
  latency: number;
  isError: boolean;
};

type AiGenerationCaptureContext = AiCaptureContext & {
  outputChoices: unknown[];
  outputTokens: number;
};

export function redactAiInput(input: {
  kind: "analysis" | "embedding";
  title: string;
  charCount: number;
}): { kind: string; title: string; charCount: number } {
  return {
    kind: input.kind,
    title: input.title.slice(0, 200),
    charCount: input.charCount,
  };
}

export function captureAiGeneration(context: AiGenerationCaptureContext): void {
  getPostHogClient()?.capture({
    distinctId: context.sessionId,
    event: "$ai_generation",
    properties: {
      "$ai_session_id": context.sessionId,
      "$ai_trace_id": context.traceId,
      "$ai_model": context.model,
      "$ai_provider": "openai",
      "$ai_input": context.input,
      "$ai_output_choices": context.outputChoices,
      "$ai_input_tokens": context.inputTokens,
      "$ai_output_tokens": context.outputTokens,
      "$ai_latency": context.latency,
      "$ai_is_error": context.isError,
    },
  });
}

export function captureAiEmbedding(context: AiCaptureContext): void {
  getPostHogClient()?.capture({
    distinctId: context.sessionId,
    event: "$ai_embedding",
    properties: {
      "$ai_session_id": context.sessionId,
      "$ai_trace_id": context.traceId,
      "$ai_model": context.model,
      "$ai_provider": "openai",
      "$ai_input": context.input,
      "$ai_input_tokens": context.inputTokens,
      "$ai_latency": context.latency,
      "$ai_is_error": context.isError,
    },
  });
}

export async function flushAiObservability(): Promise<void> {
  await getPostHogClient()?.flush().catch(() => {});
}
