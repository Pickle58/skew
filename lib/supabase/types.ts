import type { Database, Json, Tables, TablesInsert } from "@/lib/supabase/database.types";

export type { Database, Json, Tables, TablesInsert };

export const SENTIMENT_LABELS = ["positive", "neutral", "negative"] as const;
export type SentimentLabel = (typeof SENTIMENT_LABELS)[number];

export const BIAS_LABELS = ["left", "center", "right", "mixed", "unclear"] as const;
export type BiasLabel = (typeof BIAS_LABELS)[number];

export const LOG_LEVELS = ["info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_SCOPES = ["scrape", "analyze", "scheduler", "cron"] as const;
export type LogScope = (typeof LOG_SCOPES)[number];

function oneOf<T extends string>(allowed: readonly T[], value: string, field: string): T {
  const match = allowed.find((item) => item === value);
  if (match === undefined) {
    throw new Error(`Unexpected ${field}: ${value}`);
  }
  return match;
}

export function toSentimentLabel(value: string): SentimentLabel {
  return oneOf(SENTIMENT_LABELS, value, "sentiment_label");
}

export function toBiasLabel(value: string): BiasLabel {
  return oneOf(BIAS_LABELS, value, "bias_label");
}

export function toLogLevel(value: string): LogLevel {
  return oneOf(LOG_LEVELS, value, "log level");
}

export function toLogScope(value: string): LogScope {
  return oneOf(LOG_SCOPES, value, "log scope");
}

export type SourceRow = Tables<"sources">;

export type ArticleRow = Tables<"articles">;
export type ArticleInsert = TablesInsert<"articles">;

export type ArticleAnalysisRow = Omit<Tables<"article_analyses">, "sentiment_label" | "bias_label"> & {
  sentiment_label: SentimentLabel;
  bias_label: BiasLabel;
};

// bias_score is a generated column; the database computes it.
export type ArticleAnalysisInsert = Omit<
  TablesInsert<"article_analyses">,
  "bias_score" | "id" | "created_at" | "sentiment_label" | "bias_label"
> & {
  sentiment_label: SentimentLabel;
  bias_label: BiasLabel;
};

export type LogRow = Omit<Tables<"logs">, "level" | "scope"> & {
  level: LogLevel;
  scope: LogScope;
};
export type LogInsert = Omit<TablesInsert<"logs">, "level" | "scope"> & {
  level: LogLevel;
  scope: LogScope;
};

export type OxylabsScheduleRow = Tables<"oxylabs_schedules">;
export type OxylabsScheduleRunRow = Tables<"oxylabs_schedule_runs">;

export type ArticleSource = Pick<SourceRow, "id" | "name" | "logo_url">;

export type ArticleCard = Pick<ArticleRow, "id" | "title" | "image_url" | "published_at"> & {
  source: ArticleSource;
  analysis: Pick<
    ArticleAnalysisRow,
    | "sentiment_label"
    | "bias_label"
    | "left_percentage"
    | "center_percentage"
    | "right_percentage"
    | "confidence"
  >;
};

export type ArticleDetail = ArticleRow & {
  source: ArticleSource;
  analysis: Omit<ArticleAnalysisRow, "embedding">;
};

export type ArticleRecord = ArticleRow & {
  source: ArticleSource;
  analysis: ArticleAnalysisRow;
};

export type PendingArticle = Pick<ArticleRow, "id" | "source_id" | "title" | "raw_text" | "published_at">;

export type EmbeddingBackfillArticle = PendingArticle & {
  analyzed_at: string | null;
};

export type RelatedArticle = Pick<ArticleRow, "id" | "title" | "image_url" | "published_at"> & {
  source_name: string;
};
