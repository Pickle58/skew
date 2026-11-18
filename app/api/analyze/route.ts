import { z } from "zod";
import { isAuthorizedAdminRequest } from "@/lib/api/admin-auth";
import { MAX_ANALYSIS_ARTICLE_IDS, MAX_ANALYSIS_BATCH_SIZE, MAX_ANALYSIS_LIMIT } from "@/lib/limits";
import { runAnalyzePipeline } from "@/lib/pipeline/analyze";
import { flushAiObservability } from "@/lib/posthog-ai";
import { emitPostHogLog } from "@/lib/posthog-logs";
import { getPostHogClient } from "@/lib/posthog-server";

export const maxDuration = 300;

// This API is authorized with an admin secret rather than a Clerk session, so no stable user id reaches this handler.
const DISTINCT_ID = "DISTINCT_ID";

const analyzeRequestSchema = z
  .object({
    articleIds: z.array(z.uuid()).min(1).max(MAX_ANALYSIS_ARTICLE_IDS).optional(),
    limit: z.number().int().min(1).max(MAX_ANALYSIS_LIMIT).optional(),
    batchSize: z.number().int().min(1).max(MAX_ANALYSIS_BATCH_SIZE).optional(),
  })
  .strict();

async function readJsonBody(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const text = await request.text();
  if (text.trim().length === 0) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = analyzeRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", issues: z.treeifyError(parsed.error) }, { status: 400 });
  }

  try {
    const summary = await runAnalyzePipeline(parsed.data);
    const posthog = getPostHogClient();
    posthog?.capture({
      distinctId: DISTINCT_ID,
      event: "analysis_run_completed",
      properties: {
        status: summary.status,
        articles_considered: summary.articlesConsidered,
        articles_analyzed: summary.analyzed,
        articles_skipped: summary.skipped,
        articles_failed: summary.failed,
        batches: summary.batches,
        duration_ms: summary.durationMs,
      },
    });
    await posthog?.flush().catch(() => {});
    await emitPostHogLog("analysis pipeline completed", "INFO", {
      operation: "analysis_pipeline",
      outcome: summary.status,
      articles_considered: summary.articlesConsidered,
      articles_analyzed: summary.analyzed,
      articles_skipped: summary.skipped,
      articles_failed: summary.failed,
      batches: summary.batches,
      duration_ms: summary.durationMs,
    });
    return Response.json(summary);
  } catch (error) {
    const posthog = getPostHogClient();
    posthog?.capture({
      distinctId: DISTINCT_ID,
      event: "analysis_run_failed",
      properties: {
        error_message: error instanceof Error ? error.message : "unknown error",
      },
    });
    posthog?.captureException(error instanceof Error ? error : new Error("Analysis failed"), DISTINCT_ID);
    await posthog?.flush().catch(() => {});
    await emitPostHogLog("analysis pipeline failed", "ERROR", {
      operation: "analysis_pipeline",
      outcome: "failed",
    });
    console.error("[analyze] unexpected failure:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  } finally {
    await flushAiObservability();
  }
}
