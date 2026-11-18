import "server-only";
import { randomUUID } from "node:crypto";
import { analyzeArticleText } from "@/lib/ai/analyze-article";
import { embedArticleText } from "@/lib/ai/embed-article";
import { getAnalysisBatchSize, getOpenAIApiKey } from "@/lib/env/server";
import { ANALYSIS_MODEL } from "@/lib/limits";
import { errorMessage } from "@/lib/pipeline/logger";
import type { AnalyzeOptions, AnalyzeRunStatus, AnalyzeRunSummary } from "@/lib/pipeline/types";
import { insertArticleAnalysis, updateArticleEmbedding } from "@/lib/supabase/queries/analyses";
import {
  listArticlesMissingEmbedding,
  listPendingAnalysisArticles,
  markArticleAnalyzed,
} from "@/lib/supabase/queries/articles";
import { insertLog } from "@/lib/supabase/queries/logs";
import type { EmbeddingBackfillArticle, Json, PendingArticle } from "@/lib/supabase/types";

const PREFIX = "[analyze]";

type Outcome = "analyzed" | "skipped" | "failed";

function logStep(message: string): void {
  console.log(`${PREFIX} ${message}`);
}

function logWarn(message: string): void {
  console.warn(`${PREFIX} ${message}`);
}

function logError(message: string): void {
  console.error(`${PREFIX} ${message}`);
}

function safeError(error: unknown): string {
  const message = errorMessage(error);
  return message.length > 300 ? `${message.slice(0, 300)}…` : message;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && (error.message.includes("23505") || error.message.includes("duplicate key"));
}

function toJson(summary: AnalyzeRunSummary): { [key: string]: Json | undefined } {
  return JSON.parse(JSON.stringify(summary));
}

async function finish(summary: AnalyzeRunSummary): Promise<AnalyzeRunSummary> {
  const seconds = (summary.durationMs / 1000).toFixed(1);
  if (summary.status === "failed") {
    logError(`failed in ${seconds}s`);
  } else {
    logStep(`${summary.status} in ${seconds}s`);
  }
  console.log(`${PREFIX} summary`, summary);
  await insertLog({
    level: summary.status === "completed" ? "info" : summary.status === "partial" ? "warn" : "error",
    scope: "analyze",
    message: `Analysis ${summary.status}`,
    context: toJson(summary),
  });
  return summary;
}

async function markSaved(id: string): Promise<void> {
  try {
    await markArticleAnalyzed(id);
  } catch {
    await markArticleAnalyzed(id);
  }
}

type WorkItem =
  | { kind: "analysis"; article: PendingArticle }
  | { kind: "embedding"; article: EmbeddingBackfillArticle };

async function recordFailure(article: PendingArticle, message: string, error: unknown): Promise<void> {
  logWarn(`failed ${article.id}: ${safeError(error)}`);
  await insertLog({
    level: "warn",
    scope: "analyze",
    message,
    context: { articleId: article.id, title: article.title, error: safeError(error) },
  });
}

async function processAnalysis(article: PendingArticle, aiSessionId: string, aiTraceId: string): Promise<Outcome> {
  if (article.raw_text.trim().length === 0) {
    logWarn(`skipped empty text ${article.id}`);
    return "skipped";
  }

  let analysis: Awaited<ReturnType<typeof analyzeArticleText>>;
  let embedding: string;
  try {
    [analysis, embedding] = await Promise.all([
      analyzeArticleText({ title: article.title, rawText: article.raw_text, aiSessionId, aiTraceId }),
      embedArticleText({ title: article.title, rawText: article.raw_text, aiSessionId, aiTraceId }),
    ]);
  } catch (error) {
    await recordFailure(article, "Article analysis failed", error);
    return "failed";
  }

  try {
    await insertArticleAnalysis({ ...analysis, article_id: article.id, embedding });
  } catch (error) {
    if (isUniqueViolation(error)) {
      logWarn(`skipped existing analysis ${article.id}`);
      return "skipped";
    }
    logWarn(`save failed ${article.id}: ${safeError(error)}`);
    await insertLog({
      level: "error",
      scope: "analyze",
      message: "Article analysis save failed",
      context: { articleId: article.id, title: article.title, error: safeError(error) },
    });
    return "failed";
  }

  try {
    await markSaved(article.id);
  } catch (error) {
    logError(`saved analysis but could not mark ${article.id}: ${safeError(error)}`);
    await insertLog({
      level: "error",
      scope: "analyze",
      message: "Saved analysis but failed to mark article analyzed",
      context: { articleId: article.id, title: article.title, error: safeError(error) },
    });
    return "failed";
  }

  logStep(`analyzed ${article.id} "${article.title}"`);
  return "analyzed";
}

async function processEmbedding(
  article: EmbeddingBackfillArticle,
  aiSessionId: string,
  aiTraceId: string,
): Promise<Outcome> {
  if (article.raw_text.trim().length === 0) {
    logWarn(`skipped empty text ${article.id}`);
    return "skipped";
  }

  let embedding: string;
  try {
    embedding = await embedArticleText({ title: article.title, rawText: article.raw_text, aiSessionId, aiTraceId });
  } catch (error) {
    await recordFailure(article, "Article embedding failed", error);
    return "failed";
  }

  try {
    await updateArticleEmbedding(article.id, embedding);
  } catch (error) {
    logWarn(`save failed ${article.id}: ${safeError(error)}`);
    await insertLog({
      level: "error",
      scope: "analyze",
      message: "Article embedding save failed",
      context: { articleId: article.id, title: article.title, error: safeError(error) },
    });
    return "failed";
  }

  if (article.analyzed_at === null) {
    try {
      await markSaved(article.id);
    } catch (error) {
      logError(`saved embedding but could not mark ${article.id}: ${safeError(error)}`);
      await insertLog({
        level: "error",
        scope: "analyze",
        message: "Saved embedding but failed to mark article analyzed",
        context: { articleId: article.id, title: article.title, error: safeError(error) },
      });
      return "failed";
    }
  }

  logStep(`embedded ${article.id} "${article.title}"`);
  return "analyzed";
}

async function processArticle(item: WorkItem, aiSessionId: string): Promise<Outcome> {
  const aiTraceId = randomUUID();
  switch (item.kind) {
    case "analysis":
      return processAnalysis(item.article, aiSessionId, aiTraceId);
    case "embedding":
      return processEmbedding(item.article, aiSessionId, aiTraceId);
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

function resolveStatus(analyzed: number, failed: number, fatal: boolean): AnalyzeRunStatus {
  if (fatal || (failed > 0 && analyzed === 0)) return "failed";
  if (failed > 0) return "partial";
  return "completed";
}

export async function runAnalyzePipeline(options: AnalyzeOptions = {}): Promise<AnalyzeRunSummary> {
  const startedAt = Date.now();
  const aiSessionId = `analysis-run-${randomUUID()}`;
  const batchSize = options.batchSize ?? getAnalysisBatchSize();
  const attempted: string[] = [];
  let analyzed = 0;
  let skipped = 0;
  let failed = 0;
  let batches = 0;
  let considered = 0;
  let fatal = false;

  const build = (error?: string): AnalyzeRunSummary => ({
    status: resolveStatus(analyzed, failed, fatal),
    articlesConsidered: considered,
    analyzed,
    skipped,
    failed,
    batches,
    durationMs: Date.now() - startedAt,
    model: ANALYSIS_MODEL,
    ...(error ? { error } : {}),
  });

  logStep(
    `started batchSize=${batchSize} limit=${options.limit ?? "all"} articleIds=${options.articleIds?.length ?? 0}`,
  );
  await insertLog({
    level: "info",
    scope: "analyze",
    message: "Analysis started",
    context: {
      batchSize,
      limit: options.limit ?? null,
      articleIdCount: options.articleIds?.length ?? 0,
      model: ANALYSIS_MODEL,
    },
  });

  try {
    getOpenAIApiKey();
  } catch (error) {
    fatal = true;
    logError(safeError(error));
    return finish(build("Missing OpenAI API key"));
  }

  let fatalMessage: string | undefined;
  try {
    const processed = () => analyzed + skipped + failed;
    while (options.limit === undefined || processed() < options.limit) {
      const room = options.limit === undefined ? batchSize : Math.min(batchSize, options.limit - processed());
      if (room <= 0) break;

      const pending = await listPendingAnalysisArticles(room, {
        articleIds: options.articleIds,
        excludeIds: attempted,
      });
      const batch: WorkItem[] = pending.map((article) => ({ kind: "analysis", article }));
      if (batch.length < room) {
        const backfill = await listArticlesMissingEmbedding(room - batch.length, {
          articleIds: options.articleIds,
          excludeIds: attempted,
        });
        const embeddingItems: WorkItem[] = backfill.map((article) => ({ kind: "embedding", article }));
        batch.push(...embeddingItems);
      }
      if (batch.length === 0) break;

      batches += 1;
      let batchAnalyzed = 0;
      let batchSkipped = 0;
      let batchFailed = 0;
      for (const item of batch) {
        attempted.push(item.article.id);
        considered += 1;
        const outcome = await processArticle(item, aiSessionId);
        if (outcome === "analyzed") {
          analyzed += 1;
          batchAnalyzed += 1;
        } else if (outcome === "skipped") {
          skipped += 1;
          batchSkipped += 1;
        } else {
          failed += 1;
          batchFailed += 1;
        }
      }
      logStep(`batch ${batches}: analyzed=${batchAnalyzed} skipped=${batchSkipped} failed=${batchFailed}`);
    }

    if (options.articleIds && options.articleIds.length > 0) {
      const [stillPending, stillMissingEmbedding] = await Promise.all([
        listPendingAnalysisArticles(options.articleIds.length, {
          articleIds: options.articleIds,
        }),
        listArticlesMissingEmbedding(options.articleIds.length, {
          articleIds: options.articleIds,
        }),
      ]);
      const pendingIds = new Set(
        [...stillPending, ...stillMissingEmbedding].map((article) => article.id),
      );
      const notPending = options.articleIds.filter((id) => !pendingIds.has(id) && !attempted.includes(id));
      skipped += notPending.length;
      considered += notPending.length;
    }
  } catch (error) {
    fatal = true;
    fatalMessage = "Analysis failed";
    logError(safeError(error));
    await insertLog({
      level: "error",
      scope: "analyze",
      message: "Analysis failed",
      context: { error: safeError(error) },
    });
  }

  return finish(build(fatalMessage));
}
