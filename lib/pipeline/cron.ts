import "server-only";
import { runAnalyzePipeline } from "@/lib/pipeline/analyze";
import { errorMessage } from "@/lib/pipeline/logger";
import { runScrapePipeline } from "@/lib/pipeline/scrape";
import type {
  AnalyzeRunSummary,
  CronPipelineStatus,
  CronPipelineSummary,
  ScrapeRunSummary,
} from "@/lib/pipeline/types";
import { insertLog } from "@/lib/supabase/queries/logs";
import type { Json } from "@/lib/supabase/types";

const PREFIX = "[cron]";

function logStep(message: string): void {
  console.log(`${PREFIX} ${message}`);
}

function logError(message: string): void {
  console.error(`${PREFIX} ${message}`);
}

function toJson(summary: CronPipelineSummary): { [key: string]: Json | undefined } {
  return JSON.parse(JSON.stringify(summary));
}

function failedScrape(error: unknown, durationMs: number): ScrapeRunSummary {
  return {
    status: "failed",
    trigger: "cron",
    sourcesChecked: 0,
    candidatesFound: 0,
    candidatesRejected: 0,
    duplicatesSkipped: 0,
    detailPagesScraped: 0,
    articlesInserted: 0,
    articlesRejected: 0,
    articlesFailed: 0,
    durationMs,
    rejectionReasons: {},
    perSource: [],
    error: errorMessage(error),
  };
}

function failedAnalyze(error: unknown, durationMs: number): AnalyzeRunSummary {
  return {
    status: "failed",
    articlesConsidered: 0,
    analyzed: 0,
    skipped: 0,
    failed: 0,
    batches: 0,
    durationMs,
    model: "",
    error: errorMessage(error),
  };
}

function combineStatus(scrape: ScrapeRunSummary, analyze: AnalyzeRunSummary): CronPipelineStatus {
  if (scrape.status === "completed" && analyze.status === "completed") {
    return "completed";
  }
  if (scrape.status === "failed" && analyze.status === "failed") {
    return "failed";
  }
  return "partial";
}

export async function runCronPipeline(): Promise<CronPipelineSummary> {
  const startedAt = Date.now();
  logStep("started");
  await insertLog({
    level: "info",
    scope: "cron",
    message: "Cron pipeline started",
  });

  let scrape: ScrapeRunSummary;
  const scrapeStartedAt = Date.now();
  try {
    scrape = await runScrapePipeline({ trigger: "cron" });
  } catch (error) {
    logError(`scrape threw: ${errorMessage(error)}`);
    scrape = failedScrape(error, Date.now() - scrapeStartedAt);
  }

  await insertLog({
    level: scrape.status === "completed" ? "info" : scrape.status === "partial" ? "warn" : "error",
    scope: "cron",
    message: `Cron scrape ${scrape.status}`,
    context: { scrapeStatus: scrape.status, articlesInserted: scrape.articlesInserted, error: scrape.error },
  });

  let analyze: AnalyzeRunSummary;
  const analyzeStartedAt = Date.now();
  try {
    analyze = await runAnalyzePipeline({});
  } catch (error) {
    logError(`analyze threw: ${errorMessage(error)}`);
    analyze = failedAnalyze(error, Date.now() - analyzeStartedAt);
  }

  await insertLog({
    level: analyze.status === "completed" ? "info" : analyze.status === "partial" ? "warn" : "error",
    scope: "cron",
    message: `Cron analyze ${analyze.status}`,
    context: {
      analyzeStatus: analyze.status,
      analyzed: analyze.analyzed,
      failed: analyze.failed,
      error: analyze.error,
    },
  });

  const summary: CronPipelineSummary = {
    status: combineStatus(scrape, analyze),
    scrape,
    analyze,
    durationMs: Date.now() - startedAt,
  };

  const seconds = (summary.durationMs / 1000).toFixed(1);
  if (summary.status === "failed") {
    logError(`failed in ${seconds}s`);
  } else {
    logStep(`${summary.status} in ${seconds}s`);
  }
  console.log(`${PREFIX} summary`, summary);

  await insertLog({
    level: summary.status === "completed" ? "info" : summary.status === "partial" ? "warn" : "error",
    scope: "cron",
    message: `Cron pipeline ${summary.status}`,
    context: toJson(summary),
  });

  return summary;
}
