import { MIN_ARTICLE_CHARS, MIN_ARTICLE_PARAGRAPHS } from "@/lib/limits";
import type { ParsedArticle } from "@/lib/parsing/article";
import { isHeadlineLike } from "@/lib/parsing/clean";
import { checkArticleUrl } from "@/lib/parsing/links";
import type { ParserStrategy } from "@/lib/parsing/strategies";
import type { ArticleRejectionReason } from "@/lib/pipeline/types";
import type { ArticleInsert, SourceRow } from "@/lib/supabase/types";

export type ArticleValidation =
  | { ok: true; article: ArticleInsert }
  | { ok: false; reason: ArticleRejectionReason };

const MIN_TITLE_CHARS = 15;
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;
const MAX_HEADLINE_SHARE = 0.5;
const GENERIC_TITLE =
  /^(home|homepage|news|latest( news)?|top (news|stories)|breaking news|world( news)?|us( news)?|politics|business|sports?|live( updates)?|podcasts?|videos?|opinion|technology|entertainment|search|newsletters?|games?|puzzles|shop|deals|about us|contact us)$/i;

function isGenericTitle(title: string, sourceName: string): boolean {
  return (
    title.length < MIN_TITLE_CHARS ||
    title.toLowerCase() === sourceName.toLowerCase() ||
    GENERIC_TITLE.test(title)
  );
}

function isValidPublishedAt(date: Date | null): date is Date {
  return date !== null && date.getTime() <= Date.now() + MAX_FUTURE_MS;
}

function hasMeaningfulBody(paragraphs: readonly string[]): boolean {
  const chars = paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
  return paragraphs.length >= MIN_ARTICLE_PARAGRAPHS || chars >= MIN_ARTICLE_CHARS;
}

function isMostlyHeadlines(paragraphs: readonly string[]): boolean {
  const headlineCount = paragraphs.filter(isHeadlineLike).length;
  return headlineCount / paragraphs.length > MAX_HEADLINE_SHARE;
}

export function validateArticle(
  parsed: ParsedArticle,
  source: SourceRow,
  strategy: ParserStrategy,
): ArticleValidation {
  if (!parsed.title) return { ok: false, reason: "missing_title" };
  if (isGenericTitle(parsed.title, source.name)) return { ok: false, reason: "generic_title" };
  if (!parsed.imageUrl) return { ok: false, reason: "missing_image" };
  if (!isValidPublishedAt(parsed.publishedAt)) return { ok: false, reason: "missing_published_date" };
  if (parsed.canonicalUrl && checkArticleUrl(parsed.canonicalUrl, source.listing_url, strategy)) {
    return { ok: false, reason: "canonical_not_article" };
  }
  if (!hasMeaningfulBody(parsed.paragraphs)) return { ok: false, reason: "thin_body" };
  if (isMostlyHeadlines(parsed.paragraphs)) return { ok: false, reason: "body_mostly_headlines" };

  return {
    ok: true,
    article: {
      source_id: source.id,
      original_url: parsed.url,
      canonical_url: parsed.canonicalUrl && parsed.canonicalUrl !== parsed.url ? parsed.canonicalUrl : null,
      title: parsed.title,
      image_url: parsed.imageUrl,
      published_at: parsed.publishedAt.toISOString(),
      raw_text: parsed.paragraphs.join("\n\n"),
    },
  };
}
