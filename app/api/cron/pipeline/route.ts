import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";
import { runCronPipeline } from "@/lib/pipeline/cron";
import { flushAiObservability } from "@/lib/posthog-ai";
import { emitPostHogLog } from "@/lib/posthog-logs";
import { getPostHogClient } from "@/lib/posthog-server";

export const maxDuration = 300;

// Vercel Cron is the only caller, so every run is attributed to one fixed id.
const DISTINCT_ID = "vercel-cron";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runCronPipeline();
    const posthog = getPostHogClient();
    posthog?.capture({
      distinctId: DISTINCT_ID,
      event: "cron_pipeline_completed",
      properties: {
        status: summary.status,
        scrape_status: summary.scrape.status,
        analyze_status: summary.analyze.status,
        articles_inserted: summary.scrape.articlesInserted,
        articles_analyzed: summary.analyze.analyzed,
        articles_failed: summary.scrape.articlesFailed + summary.analyze.failed,
        duration_ms: summary.durationMs,
        $process_person_profile: false,
      },
    });
    await posthog?.flush().catch(() => {});
    await emitPostHogLog("cron pipeline completed", summary.status === "failed" ? "ERROR" : "INFO", {
      operation: "cron_pipeline",
      outcome: summary.status,
      scrape_status: summary.scrape.status,
      analyze_status: summary.analyze.status,
      articles_inserted: summary.scrape.articlesInserted,
      articles_analyzed: summary.analyze.analyzed,
      duration_ms: summary.durationMs,
    });
    return Response.json(summary);
  } catch (error) {
    const posthog = getPostHogClient();
    posthog?.capture({
      distinctId: DISTINCT_ID,
      event: "cron_pipeline_failed",
      properties: {
        error_message: error instanceof Error ? error.message : "unknown error",
        $process_person_profile: false,
      },
    });
    posthog?.captureException(error instanceof Error ? error : new Error("Cron pipeline failed"), DISTINCT_ID);
    await posthog?.flush().catch(() => {});
    await emitPostHogLog("cron pipeline failed", "ERROR", {
      operation: "cron_pipeline",
      outcome: "failed",
    });
    console.error("[cron] unexpected failure:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Cron pipeline failed" }, { status: 500 });
  } finally {
    await flushAiObservability();
  }
}
