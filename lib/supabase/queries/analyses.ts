import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { queryError, toAnalysisRow } from "@/lib/supabase/queries/shared";
import type { ArticleAnalysisInsert, ArticleAnalysisRow } from "@/lib/supabase/types";

export async function insertArticleAnalysis(row: ArticleAnalysisInsert): Promise<ArticleAnalysisRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("article_analyses")
    .insert(row)
    .select()
    .single();
  if (error) throw queryError("insertArticleAnalysis", error);
  return toAnalysisRow(data);
}

export async function updateArticleEmbedding(articleId: string, embedding: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("article_analyses")
    .update({ embedding })
    .eq("article_id", articleId)
    .is("embedding", null);
  if (error) throw queryError("updateArticleEmbedding", error);
}
