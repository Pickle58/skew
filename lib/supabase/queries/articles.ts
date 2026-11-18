import "server-only";
import { cache } from "react";
import { EMBEDDING_DIMENSIONS, RELATED_ARTICLE_LIMIT, URL_EXISTENCE_CHUNK_SIZE } from "@/lib/limits";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  chunk,
  queryError,
  toAnalysisRow,
  uniqueNonEmpty,
  UNIQUE_VIOLATION,
} from "@/lib/supabase/queries/shared";
import {
  toBiasLabel,
  toSentimentLabel,
  type ArticleCard,
  type ArticleDetail,
  type ArticleInsert,
  type ArticleRow,
  type EmbeddingBackfillArticle,
  type PendingArticle,
  type RelatedArticle,
} from "@/lib/supabase/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_CARD_LIMIT = 30;

export async function findExistingArticleUrls(urls: string[]): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const existing = new Set<string>();

  for (const urlChunk of chunk(uniqueNonEmpty(urls), URL_EXISTENCE_CHUNK_SIZE)) {
    const [byOriginal, byCanonical] = await Promise.all([
      supabase.from("articles").select("original_url").in("original_url", urlChunk),
      supabase.from("articles").select("canonical_url").in("canonical_url", urlChunk),
    ]);
    if (byOriginal.error) throw queryError("findExistingArticleUrls", byOriginal.error);
    if (byCanonical.error) throw queryError("findExistingArticleUrls", byCanonical.error);

    for (const row of byOriginal.data) existing.add(row.original_url);
    for (const row of byCanonical.data) {
      if (row.canonical_url) existing.add(row.canonical_url);
    }
  }

  return existing;
}

async function insertIgnoringDuplicates(rows: ArticleInsert[]) {
  return getSupabaseAdmin()
    .from("articles")
    .upsert(rows, { onConflict: "original_url", ignoreDuplicates: true })
    .select();
}

export async function insertArticles(
  rows: ArticleInsert[],
): Promise<{ inserted: ArticleRow[]; skipped: number }> {
  if (rows.length === 0) {
    return { inserted: [], skipped: 0 };
  }

  const batch = await insertIgnoringDuplicates(rows);
  if (!batch.error) {
    return { inserted: batch.data, skipped: rows.length - batch.data.length };
  }
  if (batch.error.code !== UNIQUE_VIOLATION) {
    throw queryError("insertArticles", batch.error);
  }

  // A canonical_url collision fails the whole batch, so retry row by row to keep the valid ones.
  const inserted: ArticleRow[] = [];
  for (const row of rows) {
    const single = await insertIgnoringDuplicates([row]);
    if (single.error) {
      if (single.error.code === UNIQUE_VIOLATION) continue;
      throw queryError("insertArticles", single.error);
    }
    inserted.push(...single.data);
  }
  return { inserted, skipped: rows.length - inserted.length };
}

export async function listArticleCards(options: { limit?: number } = {}): Promise<ArticleCard[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("articles")
    .select(
      "id, title, image_url, published_at, source:sources!inner(id, name, logo_url), analysis:article_analyses!inner(sentiment_label, bias_label, left_percentage, center_percentage, right_percentage, confidence)",
    )
    .not("analyzed_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(options.limit ?? DEFAULT_CARD_LIMIT);
  if (error) throw queryError("listArticleCards", error);

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    published_at: row.published_at,
    source: row.source,
    analysis: {
      ...row.analysis,
      sentiment_label: toSentimentLabel(row.analysis.sentiment_label),
      bias_label: toBiasLabel(row.analysis.bias_label),
    },
  }));
}

export const getArticleMetadata = cache(async (id: string): Promise<{ title: string } | null> => {
  if (!UUID_PATTERN.test(id)) {
    return null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("articles")
    .select("title")
    .eq("id", id)
    .not("analyzed_at", "is", null)
    .maybeSingle();
  if (error) throw queryError("getArticleMetadata", error);
  if (!data) return null;
  return { title: data.title };
});

export const getArticleDetail = cache(async (id: string): Promise<ArticleDetail | null> => {
  if (!UUID_PATTERN.test(id)) {
    return null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("articles")
    .select(
      "*, source:sources!inner(id, name, logo_url), analysis:article_analyses!inner(id, article_id, summary, sentiment_score, sentiment_label, bias_label, left_percentage, center_percentage, right_percentage, bias_score, confidence, framing_notes, loaded_terms, disclaimer, model, created_at)",
    )
    .eq("id", id)
    .not("analyzed_at", "is", null)
    .maybeSingle();
  if (error) throw queryError("getArticleDetail", error);
  if (!data) return null;

  const { source, analysis, ...article } = data;
  const row = toAnalysisRow({ ...analysis, embedding: null });
  return {
    ...article,
    source,
    analysis: {
      id: row.id,
      article_id: row.article_id,
      summary: row.summary,
      sentiment_score: row.sentiment_score,
      sentiment_label: row.sentiment_label,
      bias_label: row.bias_label,
      left_percentage: row.left_percentage,
      center_percentage: row.center_percentage,
      right_percentage: row.right_percentage,
      bias_score: row.bias_score,
      confidence: row.confidence,
      framing_notes: row.framing_notes,
      loaded_terms: row.loaded_terms,
      disclaimer: row.disclaimer,
      model: row.model,
      created_at: row.created_at,
    },
  };
});

export async function getArticleEmbedding(articleId: string): Promise<string | null> {
  if (!UUID_PATTERN.test(articleId)) {
    return null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("article_analyses")
    .select("embedding")
    .eq("article_id", articleId)
    .maybeSingle();
  if (error) throw queryError("getArticleEmbedding", error);
  return data?.embedding ?? null;
}

function embeddingDimensions(embedding: string): number {
  if (!embedding.startsWith("[") || !embedding.endsWith("]")) return 0;
  const body = embedding.slice(1, -1).trim();
  if (body.length === 0) return 0;
  return body.split(",").length;
}

export async function getRelatedArticles(articleId: string, embedding: string | null): Promise<RelatedArticle[]> {
  if (!UUID_PATTERN.test(articleId) || embedding === null || embeddingDimensions(embedding) !== EMBEDDING_DIMENSIONS) {
    return [];
  }

  const { data, error } = await getSupabaseAdmin().rpc("match_related_articles", {
    query_embedding: embedding,
    exclude_article_id: articleId,
    match_count: RELATED_ARTICLE_LIMIT,
  });
  if (error) throw queryError("getRelatedArticles", error);

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    published_at: row.published_at,
    source_name: row.source_name,
  }));
}

export async function listPendingAnalysisArticles(
  limit: number,
  options: { articleIds?: string[]; excludeIds?: string[] } = {},
): Promise<PendingArticle[]> {
  let query = getSupabaseAdmin()
    .from("articles")
    .select("id, source_id, title, raw_text, published_at, article_analyses!left(id)")
    .is("article_analyses", null)
    .is("analysis_abandoned_at", null);

  const articleIds = options.articleIds?.filter((id) => UUID_PATTERN.test(id));
  if (articleIds && articleIds.length > 0) {
    query = query.in("id", articleIds);
  }
  const excludeIds = options.excludeIds?.filter((id) => UUID_PATTERN.test(id));
  if (excludeIds && excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query.order("scraped_at", { ascending: true }).limit(limit);
  if (error) throw queryError("listPendingAnalysisArticles", error);

  return data.map(({ id, source_id, title, raw_text, published_at }) => ({
    id,
    source_id,
    title,
    raw_text,
    published_at,
  }));
}

export async function listArticlesMissingEmbedding(
  limit: number,
  options: { articleIds?: string[]; excludeIds?: string[] } = {},
): Promise<EmbeddingBackfillArticle[]> {
  let query = getSupabaseAdmin()
    .from("article_analyses")
    .select("article:articles!inner(id, source_id, title, raw_text, published_at, analyzed_at)")
    .is("embedding", null);

  const articleIds = options.articleIds?.filter((id) => UUID_PATTERN.test(id));
  if (articleIds && articleIds.length > 0) {
    query = query.in("article_id", articleIds);
  }
  const excludeIds = options.excludeIds?.filter((id) => UUID_PATTERN.test(id));
  if (excludeIds && excludeIds.length > 0) {
    query = query.not("article_id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query.order("created_at", { ascending: true }).limit(limit);
  if (error) throw queryError("listArticlesMissingEmbedding", error);

  return data.map(({ article }) => ({
    id: article.id,
    source_id: article.source_id,
    title: article.title,
    raw_text: article.raw_text,
    published_at: article.published_at,
    analyzed_at: article.analyzed_at,
  }));
}

export async function markArticleAnalyzed(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("articles")
    .update({ analyzed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw queryError("markArticleAnalyzed", error);
}

export async function repairAnalyzedAtOrphans(): Promise<number> {
  const { data, error } = await getSupabaseAdmin().rpc("repair_analyzed_at_orphans");
  if (error) throw queryError("repairAnalyzedAtOrphans", error);
  return data ?? 0;
}

export async function recordAnalysisFailure(id: string, message: string, maxAttempts: number): Promise<void> {
  const { data, error } = await getSupabaseAdmin()
    .from("articles")
    .select("analysis_attempt_count")
    .eq("id", id)
    .maybeSingle();
  if (error) throw queryError("recordAnalysisFailure.select", error);

  const nextCount = (data?.analysis_attempt_count ?? 0) + 1;
  const abandoned = nextCount >= maxAttempts;
  const { error: updateError } = await getSupabaseAdmin()
    .from("articles")
    .update({
      analysis_attempt_count: nextCount,
      analysis_last_error: message.slice(0, 500),
      ...(abandoned ? { analysis_abandoned_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);
  if (updateError) throw queryError("recordAnalysisFailure.update", updateError);
}

export async function getArticleAnalyzedAt(id: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("articles")
    .select("analyzed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw queryError("getArticleAnalyzedAt", error);
  return data?.analyzed_at ?? null;
}
