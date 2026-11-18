import "server-only";
import {
  toBiasLabel,
  toSentimentLabel,
  type ArticleAnalysisRow,
  type Tables,
} from "@/lib/supabase/types";

export const UNIQUE_VIOLATION = "23505";

export function queryError(fn: string, error: { message: string }): Error {
  return new Error(`${fn}: ${error.message}`);
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

export function toAnalysisRow(row: Tables<"article_analyses">): ArticleAnalysisRow {
  return {
    ...row,
    sentiment_label: toSentimentLabel(row.sentiment_label),
    bias_label: toBiasLabel(row.bias_label),
  };
}
