import type { ParserStrategy } from "@/lib/parsing/strategies";
import type { SourceRow } from "@/lib/supabase/types";

export type UrlRejectionReason =
  | "invalid_url"
  | "homepage"
  | "off_site"
  | "not_article_url"
  | "reject_category"
  | "reject_topic"
  | "reject_author"
  | "reject_search"
  | "reject_show"
  | "reject_live"
  | "reject_game"
  | "reject_product"
  | "reject_corporate"
  | "reject_newsletter"
  | "reject_video";

export type ArticleRejectionReason =
  | "missing_title"
  | "generic_title"
  | "missing_image"
  | "missing_published_date"
  | "canonical_not_article"
  | "thin_body"
  | "body_mostly_headlines";

export type RejectionReason = UrlRejectionReason | ArticleRejectionReason;

export type ScrapeTrigger = "manual" | "scheduler" | "cron";

export type HomepageHtmlResult = { ok: true; html: string; url: string } | { ok: false; error: string };

export type HomepageHtmlProvider = (source: SourceRow, strategy: ParserStrategy) => Promise<HomepageHtmlResult>;

export type ScrapeOptions = {
  sourceNames?: string[];
  perSource?: number;
  homepageProvider?: HomepageHtmlProvider;
  trigger: ScrapeTrigger;
};

export type SourceScrapeResult = {
  name: string;
  inserted: number;
  rejected: number;
  failed: number;
  error?: string;
};

export type ScrapeRunStatus = "completed" | "partial" | "failed";

export type AnalyzeRunStatus = "completed" | "partial" | "failed";

export type AnalyzeOptions = {
  articleIds?: string[];
  limit?: number;
  batchSize?: number;
  /** Absolute epoch ms; analyze stops cleanly as partial when reached. */
  deadlineMs?: number;
};

export type AnalyzeRunSummary = {
  status: AnalyzeRunStatus;
  articlesConsidered: number;
  analyzed: number;
  skipped: number;
  failed: number;
  batches: number;
  durationMs: number;
  model: string;
  error?: string;
};

export type ScrapeRunSummary = {
  status: ScrapeRunStatus;
  trigger: ScrapeTrigger;
  sourcesChecked: number;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  durationMs: number;
  rejectionReasons: Partial<Record<RejectionReason, number>>;
  perSource: SourceScrapeResult[];
  unknownSources?: string[];
  error?: string;
};

export type CronPipelineStatus = "completed" | "partial" | "failed";

export type CronPipelineSummary = {
  status: CronPipelineStatus;
  scrape: ScrapeRunSummary;
  analyze: AnalyzeRunSummary;
  durationMs: number;
};
