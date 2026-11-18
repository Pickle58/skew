import { z } from "zod";
import { isAuthorizedAdminRequest } from "@/lib/api/admin-auth";
import { MAX_ARTICLES_PER_SOURCE } from "@/lib/limits";
import { runScrapePipeline } from "@/lib/pipeline/scrape";
import { emitPostHogLog } from "@/lib/posthog-logs";
import { getPostHogClient } from "@/lib/posthog-server";

export const maxDuration = 300;

// This API is authorized with an admin secret rather than a Clerk session, so no stable user id reaches this handler.
const DISTINCT_ID = "DISTINCT_ID";

const scrapeRequestSchema = z
  .object({
    sources: z.array(z.string().trim().min(1).max(100)).min(1).max(20).optional(),
    perSource: z.number().int().min(1).max(MAX_ARTICLES_PER_SOURCE).optional(),
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
  const parsed = scrapeRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", issues: z.treeifyError(parsed.error) }, { status: 400 });
  }

  try {
    const summary = await runScrapePipeline({
      sourceNames: parsed.data.sources,
      perSource: parsed.data.perSource,
      trigger: "manual",
    });
    const posthog = getPostHogClient();
    posthog?.capture({
      distinctId: DISTINCT_ID,
      event: "scrape_run_completed",
      properties: {
        status: summary.status,
        sources_checked: summary.sourcesChecked,
        articles_inserted: summary.articlesInserted,
        articles_rejected: summary.articlesRejected,
        articles_failed: summary.articlesFailed,
        duration_ms: summary.durationMs,
      },
    });
    await posthog?.flush().catch(() => {});
    await emitPostHogLog("scrape pipeline completed", "INFO", {
      operation: "scrape_pipeline",
      outcome: summary.status,
      sources_checked: summary.sourcesChecked,
      articles_inserted: summary.articlesInserted,
      articles_rejected: summary.articlesRejected,
      articles_failed: summary.articlesFailed,
      duration_ms: summary.durationMs,
    });

    if (summary.sourcesChecked === 0 && summary.unknownSources) {
      return Response.json(
        { error: "No matching active sources", unknownSources: summary.unknownSources },
        { status: 400 },
      );
    }
    return Response.json(summary);
  } catch (error) {
    const posthog = getPostHogClient();
    posthog?.capture({
      distinctId: DISTINCT_ID,
      event: "scrape_run_failed",
      properties: {
        error_message: error instanceof Error ? error.message : "unknown error",
      },
    });
    posthog?.captureException(error instanceof Error ? error : new Error("Scrape failed"), DISTINCT_ID);
    await posthog?.flush().catch(() => {});
    await emitPostHogLog("scrape pipeline failed", "ERROR", {
      operation: "scrape_pipeline",
      outcome: "failed",
    });
    console.error("[scrape] unexpected failure:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Scrape failed" }, { status: 500 });
  }
}
