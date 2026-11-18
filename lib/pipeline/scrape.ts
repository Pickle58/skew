import "server-only";
import {
  DEFAULT_ARTICLES_PER_SOURCE,
  DETAIL_SCRAPE_CONCURRENCY,
  MAX_DETAIL_ATTEMPTS_PER_SOURCE_CAP,
} from "@/lib/limits";
import { parseArticlePage } from "@/lib/parsing/article";
import { extractCandidateLinks } from "@/lib/parsing/links";
import { getParserStrategy, type ParserStrategy } from "@/lib/parsing/strategies";
import { validateArticle } from "@/lib/parsing/validate";
import { errorMessage, logError, logStep, logWarn, RejectionTally } from "@/lib/pipeline/logger";
import type {
  HomepageHtmlProvider,
  ScrapeOptions,
  ScrapeRunStatus,
  ScrapeRunSummary,
  SourceScrapeResult,
} from "@/lib/pipeline/types";
import { fetchHtmlViaOxylabs } from "@/lib/scraping/oxylabs";
import { findExistingArticleUrls, insertArticles } from "@/lib/supabase/queries/articles";
import { insertLog } from "@/lib/supabase/queries/logs";
import { listActiveSources } from "@/lib/supabase/queries/sources";
import type { ArticleInsert, Json, SourceRow } from "@/lib/supabase/types";

type RunCounters = {
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
};

type DetailOutcome =
  | { kind: "valid"; article: ArticleInsert }
  | { kind: "rejected" }
  | { kind: "duplicate" }
  | { kind: "failed" };

type RunContext = {
  perSource: number;
  tally: RejectionTally;
  counters: RunCounters;
};

export const liveHomepageProvider: HomepageHtmlProvider = async (source, strategy) => {
  const result = await fetchHtmlViaOxylabs(source.listing_url, { render: strategy.render });
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, html: result.html, url: source.listing_url };
};

function emptyCounters(): RunCounters {
  return {
    candidatesFound: 0,
    candidatesRejected: 0,
    duplicatesSkipped: 0,
    detailPagesScraped: 0,
    articlesInserted: 0,
    articlesRejected: 0,
    articlesFailed: 0,
  };
}

function findUnknownSources(requested: readonly string[] | undefined, sources: readonly SourceRow[]): string[] {
  if (!requested || requested.length === 0) return [];
  const known = new Set(sources.map((source) => source.name.toLowerCase()));
  return requested.filter((name) => !known.has(name.trim().toLowerCase()));
}

async function scrapeDetail(
  url: string,
  source: SourceRow,
  strategy: ParserStrategy,
  context: RunContext,
): Promise<DetailOutcome> {
  const result = await fetchHtmlViaOxylabs(url, { render: strategy.render });
  if (!result.ok) {
    logWarn(`${source.name}: detail failed ${url} (${result.error.message})`);
    return { kind: "failed" };
  }
  context.counters.detailPagesScraped += 1;

  const parsed = parseArticlePage(result.html, url, strategy, source.name);
  const validation = validateArticle(parsed, source, strategy);
  if (!validation.ok) {
    context.tally.add(validation.reason);
    logStep(`${source.name}: rejected ${url} (${validation.reason})`);
    return { kind: "rejected" };
  }

  const canonical = validation.article.canonical_url;
  if (canonical && (await findExistingArticleUrls([canonical])).has(canonical)) {
    return { kind: "duplicate" };
  }
  return { kind: "valid", article: validation.article };
}

async function collectValidArticles(
  candidates: readonly string[],
  source: SourceRow,
  strategy: ParserStrategy,
  context: RunContext,
  result: SourceScrapeResult,
): Promise<ArticleInsert[]> {
  const maxAttempts = Math.min(context.perSource * 2, MAX_DETAIL_ATTEMPTS_PER_SOURCE_CAP);
  const queue = candidates.slice(0, maxAttempts);
  const valid: ArticleInsert[] = [];
  const seenCanonical = new Set<string>();

  for (let i = 0; i < queue.length && valid.length < context.perSource; i += DETAIL_SCRAPE_CONCURRENCY) {
    const wave = queue.slice(i, i + DETAIL_SCRAPE_CONCURRENCY);
    const outcomes = await Promise.all(wave.map((url) => scrapeDetail(url, source, strategy, context)));

    for (const outcome of outcomes) {
      switch (outcome.kind) {
        case "valid": {
          const key = outcome.article.canonical_url ?? outcome.article.original_url;
          if (seenCanonical.has(key)) {
            context.counters.duplicatesSkipped += 1;
          } else if (valid.length < context.perSource) {
            seenCanonical.add(key);
            valid.push(outcome.article);
          }
          break;
        }
        case "rejected":
          result.rejected += 1;
          context.counters.articlesRejected += 1;
          break;
        case "duplicate":
          context.counters.duplicatesSkipped += 1;
          break;
        case "failed":
          result.failed += 1;
          context.counters.articlesFailed += 1;
          break;
        default: {
          const exhaustive: never = outcome;
          return exhaustive;
        }
      }
    }
  }
  return valid;
}

async function scrapeSource(
  source: SourceRow,
  provider: HomepageHtmlProvider,
  context: RunContext,
): Promise<SourceScrapeResult> {
  const result: SourceScrapeResult = { name: source.name, inserted: 0, rejected: 0, failed: 0 };
  const strategy = getParserStrategy(source.parser_strategy);
  logStep(`${source.name}: started (strategy=${strategy.name})`);

  const homepage = await provider(source, strategy);
  if (!homepage.ok) {
    throw new Error(`homepage fetch failed: ${homepage.error}`);
  }
  logStep(`${source.name}: homepage fetched (${Math.round(homepage.html.length / 1024)} KB)`);

  const links = extractCandidateLinks(homepage.html, homepage.url, strategy);
  for (const rejected of links.rejected) context.tally.add(rejected.reason);
  context.counters.candidatesFound += links.candidates.length;
  context.counters.candidatesRejected += links.rejected.length;

  const existing = await findExistingArticleUrls(links.candidates);
  const fresh = links.candidates.filter((url) => !existing.has(url));
  context.counters.duplicatesSkipped += links.candidates.length - fresh.length;
  logStep(
    `${source.name}: candidates found=${links.candidates.length} rejected=${links.rejected.length} duplicates=${links.candidates.length - fresh.length}`,
  );

  const valid = await collectValidArticles(fresh, source, strategy, context, result);
  const { inserted, skipped } = await insertArticles(valid);
  result.inserted = inserted.length;
  context.counters.articlesInserted += inserted.length;
  context.counters.duplicatesSkipped += skipped;

  logStep(`${source.name}: inserted=${result.inserted} rejected=${result.rejected} failed=${result.failed}`);
  return result;
}

function resolveStatus(perSource: readonly SourceScrapeResult[]): ScrapeRunStatus {
  const errored = perSource.filter((source) => source.error).length;
  if (errored === 0) return "completed";
  return errored === perSource.length ? "failed" : "partial";
}

function toJson(summary: ScrapeRunSummary): { [key: string]: Json | undefined } {
  return JSON.parse(JSON.stringify(summary));
}

async function finish(summary: ScrapeRunSummary): Promise<ScrapeRunSummary> {
  const seconds = (summary.durationMs / 1000).toFixed(1);
  if (summary.status === "failed") {
    logError(`failed in ${seconds}s`);
  } else {
    logStep(`${summary.status} in ${seconds}s`);
  }
  console.log("[scrape] summary", summary);
  await insertLog({
    level: summary.status === "completed" ? "info" : summary.status === "partial" ? "warn" : "error",
    scope: "scrape",
    message: `Scrape ${summary.status}`,
    context: toJson(summary),
  });
  return summary;
}

export async function runScrapePipeline(options: ScrapeOptions): Promise<ScrapeRunSummary> {
  const startedAt = Date.now();
  const perSource = options.perSource ?? DEFAULT_ARTICLES_PER_SOURCE;
  const provider = options.homepageProvider ?? liveHomepageProvider;
  const context: RunContext = { perSource, tally: new RejectionTally(), counters: emptyCounters() };
  const results: SourceScrapeResult[] = [];

  const summarize = (status: ScrapeRunStatus, extra: Partial<ScrapeRunSummary> = {}): ScrapeRunSummary => ({
    status,
    trigger: options.trigger,
    sourcesChecked: results.length,
    ...context.counters,
    durationMs: Date.now() - startedAt,
    rejectionReasons: context.tally.toJSON(),
    perSource: results,
    ...extra,
  });

  let sources: SourceRow[];
  try {
    sources = await listActiveSources({ names: options.sourceNames });
  } catch (error) {
    logError(`could not load sources: ${errorMessage(error)}`);
    return finish(summarize("failed", { error: "Could not load sources" }));
  }

  const unknownSources = findUnknownSources(options.sourceNames, sources);
  const extra = unknownSources.length > 0 ? { unknownSources } : {};
  if (sources.length === 0) {
    logError("no matching active sources");
    return finish(summarize("failed", { ...extra, error: "No matching active sources" }));
  }

  logStep(`started (${options.trigger}) sources=${sources.length} perSource=${perSource}`);
  logStep(`selected: ${sources.map((source) => source.name).join(", ") || "none"}`);
  if (unknownSources.length > 0) logWarn(`unknown sources: ${unknownSources.join(", ")}`);
  await insertLog({
    level: "info",
    scope: "scrape",
    message: "Scrape started",
    context: { trigger: options.trigger, perSource, sources: sources.map((source) => source.name) },
  });

  for (const source of sources) {
    try {
      results.push(await scrapeSource(source, provider, context));
    } catch (error) {
      const message = errorMessage(error);
      logError(`${source.name}: ${message}`);
      results.push({ name: source.name, inserted: 0, rejected: 0, failed: 0, error: message });
      await insertLog({
        level: "error",
        scope: "scrape",
        message: `Source failed: ${source.name}`,
        context: { source: source.name, error: message },
      });
    }
  }

  return finish(summarize(resolveStatus(results), extra));
}
