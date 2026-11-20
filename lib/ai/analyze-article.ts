import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { validateAnalysisConsistency } from "@/lib/ai/analysis-validation";
import { ANALYSIS_DISCLAIMER } from "@/lib/analysis-copy";
import { getOpenAIApiKey } from "@/lib/env/server";
import { ANALYSIS_MODEL, ANALYSIS_TEXT_CHAR_LIMIT } from "@/lib/limits";
import { captureAiGeneration, redactAiInput } from "@/lib/posthog-ai";
import { BIAS_LABELS, SENTIMENT_LABELS, type ArticleAnalysisInsert } from "@/lib/supabase/types";

export { ANALYSIS_DISCLAIMER };

const analysisSchema = z
  .object({
    summary: z.string().trim().min(1).max(2000),
    sentimentScore: z.number().min(-1).max(1),
    sentimentLabel: z.enum(SENTIMENT_LABELS),
    politicalFramingLabel: z.enum(BIAS_LABELS),
    leftPercentage: z.number().int().min(0).max(100),
    centerPercentage: z.number().int().min(0).max(100),
    rightPercentage: z.number().int().min(0).max(100),
    confidence: z.number().min(0).max(1),
    framingNotes: z.array(z.string().trim().max(300)).max(8),
    loadedTerms: z.array(z.string().trim().max(80)).max(20),
  })
  .superRefine((value, ctx) => {
    const sum = value.leftPercentage + value.centerPercentage + value.rightPercentage;
    if (sum !== 100) {
      ctx.addIssue({
        code: "custom",
        message: `Framing percentages sum to ${sum}, expected 100`,
      });
    }
    for (const issue of validateAnalysisConsistency(value)) {
      ctx.addIssue({ code: "custom", message: issue });
    }
  });

type AnalysisOutput = z.infer<typeof analysisSchema>;

const INSTRUCTIONS = [
  "You analyze one news article for a reader-facing news product.",
  "Use only the article title and text. Do not infer political framing from the outlet name, even if it appears in the text.",
  "Write a neutral summary of 2 to 4 sentences.",
  "Score sentiment from the tone of the article text: sentimentScore from -1 (negative) to 1 (positive), and sentimentLabel as positive, neutral, or negative.",
  "Use sentimentLabel positive when sentimentScore >= 0.2, negative when sentimentScore <= -0.2, otherwise neutral.",
  "Estimate political framing as leftPercentage, centerPercentage, and rightPercentage. Each is an integer from 0 to 100 and the three must sum to 100.",
  "Set politicalFramingLabel to left, center, right, mixed, or unclear.",
  "The label should match the strongest percentage unless confidence is below 0.4 (use unclear) or the top two percentages are within 10 points (use mixed).",
  "confidence is from 0 to 1.",
  "framingNotes are short observations grounded in the article text. loadedTerms are loaded or slanted phrases that appear in the text. Both arrays may be empty.",
].join(" ");

function nonEmpty(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function toInsert(output: AnalysisOutput): Omit<ArticleAnalysisInsert, "article_id" | "embedding"> {
  return {
    summary: output.summary.trim(),
    sentiment_score: output.sentimentScore,
    sentiment_label: output.sentimentLabel,
    bias_label: output.politicalFramingLabel,
    left_percentage: output.leftPercentage,
    center_percentage: output.centerPercentage,
    right_percentage: output.rightPercentage,
    confidence: output.confidence,
    framing_notes: nonEmpty(output.framingNotes),
    loaded_terms: nonEmpty(output.loadedTerms),
    disclaimer: ANALYSIS_DISCLAIMER,
    model: ANALYSIS_MODEL,
  };
}

async function generateAnalysis(
  title: string,
  rawText: string,
  aiSessionId: string,
  aiTraceId: string,
): Promise<AnalysisOutput> {
  const openai = createOpenAI({ apiKey: getOpenAIApiKey() });
  const prompt = `Title: ${title}\n\nArticle text:\n${rawText}`;
  const redactedInput = redactAiInput({ kind: "analysis", title, charCount: rawText.length });
  const startedAt = Date.now();

  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model: openai(ANALYSIS_MODEL),
      instructions: INSTRUCTIONS,
      prompt,
      output: Output.object({ schema: analysisSchema }),
      maxRetries: 0,
    });
  } catch (error) {
    captureAiGeneration({
      sessionId: aiSessionId,
      traceId: aiTraceId,
      model: ANALYSIS_MODEL,
      input: redactedInput,
      outputChoices: [],
      inputTokens: 0,
      outputTokens: 0,
      latency: (Date.now() - startedAt) / 1000,
      isError: true,
    });
    throw error;
  }

  const { output, usage } = result;
  let validationError: unknown;
  try {
    if (!output) {
      throw new Error("Model returned no structured output");
    }
  } catch (error) {
    validationError = error;
  }

  captureAiGeneration({
    sessionId: aiSessionId,
    traceId: aiTraceId,
    model: ANALYSIS_MODEL,
    input: redactedInput,
    outputChoices: output ? [{ role: "assistant", content: JSON.stringify(output) }] : [],
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    latency: (Date.now() - startedAt) / 1000,
    isError: Boolean(validationError),
  });

  if (validationError) {
    throw validationError;
  }
  return output;
}

export async function analyzeArticleText(input: {
  title: string;
  rawText: string;
  aiSessionId: string;
  aiTraceId: string;
}): Promise<Omit<ArticleAnalysisInsert, "article_id" | "embedding">> {
  const rawText = input.rawText.slice(0, ANALYSIS_TEXT_CHAR_LIMIT);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const output = await generateAnalysis(input.title, rawText, input.aiSessionId, input.aiTraceId);
      return toInsert(output);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Analysis failed");
}
