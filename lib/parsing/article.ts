import { load, type CheerioAPI } from "cheerio";
import { cleanParagraphs, normalizeText, NOISE_SELECTORS, splitTextBlock } from "@/lib/parsing/clean";
import type { ParserStrategy } from "@/lib/parsing/strategies";
import { isHttpsUrl, normalizeUrl } from "@/lib/parsing/url";
import { MIN_ARTICLE_CHARS } from "@/lib/limits";

export type ParsedArticle = {
  url: string;
  title: string | null;
  canonicalUrl: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  paragraphs: string[];
};

type JsonObject = { [key: string]: unknown };

const ARTICLE_TYPES = new Set([
  "NewsArticle",
  "Article",
  "ReportageNewsArticle",
  "AnalysisNewsArticle",
  "OpinionNewsArticle",
  "BackgroundNewsArticle",
  "BlogPosting",
]);
const PREFERRED_BODY_CHARS = 300;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function collectJsonLdObjects(value: unknown, out: JsonObject[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdObjects(item, out);
    return;
  }
  if (!isObject(value)) return;
  out.push(value);
  if (Array.isArray(value["@graph"])) collectJsonLdObjects(value["@graph"], out);
}

function isArticleType(node: JsonObject): boolean {
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && ARTICLE_TYPES.has(t));
}

function findJsonLdArticle($: CheerioAPI): JsonObject | null {
  const nodes: JsonObject[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      collectJsonLdObjects(JSON.parse($(element).text()), nodes);
    } catch {
      // Malformed JSON-LD is common; other metadata sources cover it.
    }
  });
  return nodes.find(isArticleType) ?? null;
}

function jsonLdImage(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = jsonLdImage(item);
      if (url) return url;
    }
    return null;
  }
  if (isObject(value)) return asString(value.url);
  return asString(value);
}

function meta($: CheerioAPI, selector: string): string | null {
  return asString($(selector).first().attr("content"));
}

function stripSourceSuffix(title: string, sourceName: string): string {
  const escaped = sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title.replace(new RegExp(`\\s*[|\\-–—:]\\s*${escaped}\\s*$`, "i"), "").trim();
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractTitle($: CheerioAPI, ld: JsonObject | null, sourceName: string): string | null {
  const raw =
    asString(ld?.headline) ?? meta($, 'meta[property="og:title"]') ?? asString($("h1").first().text());
  if (!raw) return null;
  return normalizeText(stripSourceSuffix(normalizeText(raw), sourceName)) || null;
}

function extractImage($: CheerioAPI, ld: JsonObject | null, pageUrl: string): string | null {
  const candidates = [
    jsonLdImage(ld?.image),
    meta($, 'meta[property="og:image"]'),
    meta($, 'meta[name="twitter:image"]'),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const absolute = new URL(candidate, pageUrl).toString();
      if (isHttpsUrl(absolute)) return absolute;
    } catch {
      continue;
    }
  }
  return null;
}

function extractPublishedAt($: CheerioAPI, ld: JsonObject | null): Date | null {
  return (
    parseDate(asString(ld?.datePublished)) ??
    parseDate(meta($, 'meta[property="article:published_time"]')) ??
    parseDate(meta($, 'meta[name="pubdate"], meta[name="publish-date"], meta[name="date"]')) ??
    parseDate(meta($, 'meta[itemprop="datePublished"]')) ??
    parseDate(asString($("article time[datetime], main time[datetime]").first().attr("datetime")))
  );
}

function extractCanonical($: CheerioAPI, pageUrl: string): string | null {
  const href = asString($('link[rel="canonical"]').first().attr("href")) ?? meta($, 'meta[property="og:url"]');
  return href ? normalizeUrl(href, pageUrl) : null;
}

function totalChars(paragraphs: readonly string[]): number {
  return paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
}

function extractParagraphs($: CheerioAPI, ld: JsonObject | null, strategy: ParserStrategy): string[] {
  $([...NOISE_SELECTORS, ...strategy.bodyNoiseSelectors].join(", ")).remove();

  let best: string[] = [];
  for (const selector of strategy.bodySelectors) {
    const raw = $(selector)
      .filter((_, element) => {
        const text = normalizeText($(element).text());
        return text.length > 0 && normalizeText($(element).find("a").text()) !== text;
      })
      .map((_, element) => $(element).text())
      .get();
    const paragraphs = cleanParagraphs(raw);
    if (totalChars(paragraphs) >= PREFERRED_BODY_CHARS) return paragraphs;
    if (totalChars(paragraphs) > totalChars(best)) best = paragraphs;
  }

  const ldBody = asString(ld?.articleBody);
  if (ldBody && ldBody.length >= MIN_ARTICLE_CHARS) {
    return splitTextBlock(ldBody);
  }
  return best;
}

export function parseArticlePage(
  html: string,
  pageUrl: string,
  strategy: ParserStrategy,
  sourceName: string,
): ParsedArticle {
  const $ = load(html);
  const ld = findJsonLdArticle($);

  return {
    url: pageUrl,
    title: extractTitle($, ld, sourceName),
    canonicalUrl: extractCanonical($, pageUrl),
    imageUrl: extractImage($, ld, pageUrl),
    publishedAt: extractPublishedAt($, ld),
    paragraphs: extractParagraphs($, ld, strategy),
  };
}
