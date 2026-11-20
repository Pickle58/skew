import Image from "next/image";
import { Info } from "lucide-react";
import { BiasMethodologyButton } from "@/components/article/analysis-actions";
import { ArticleActions, OriginalArticleLink } from "@/components/article/article-actions";
import { BiasRows } from "@/components/article/bias-rows";
import { NewsletterForm } from "@/components/article/newsletter-form";
import { RelatedStories } from "@/components/article/related-stories";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { BiasMeter } from "@/components/ui/bias-meter";
import {
  formatConfidence,
  formatDate,
  formatSentimentScore,
  isHttpUrl,
  isHttpsUrl,
  labelText,
  readTime,
  splitParagraphs,
  toDateTimeAttr,
} from "@/lib/format";
import type { ArticleAnalysisRow, ArticleDetail, BiasLabel, RelatedArticle } from "@/lib/supabase/types";

type ArticlePageProps = {
  article: ArticleDetail;
  related: RelatedArticle[];
};

function labelClass(label: BiasLabel) {
  switch (label) {
    case "left":
      return "text-bias-left";
    case "center":
      return "text-muted";
    case "right":
      return "text-bias-right";
    case "mixed":
      return "text-ink";
    case "unclear":
      return "text-muted";
    default: {
      const exhaustive: never = label;
      return exhaustive;
    }
  }
}

function labelShare(analysis: Omit<ArticleAnalysisRow, "embedding">): number | null {
  switch (analysis.bias_label) {
    case "left":
      return analysis.left_percentage;
    case "center":
      return analysis.center_percentage;
    case "right":
      return analysis.right_percentage;
    case "mixed":
    case "unclear":
      return null;
    default: {
      const exhaustive: never = analysis.bias_label;
      return exhaustive;
    }
  }
}

export function ArticlePage({ article, related }: ArticlePageProps) {
  const { analysis, source } = article;
  const share = labelShare(analysis);
  const originalUrl = article.canonical_url ?? article.original_url;
  const paragraphs = splitParagraphs(article.raw_text);
  const summary = splitParagraphs(analysis.summary);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader showTopics={false} />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pt-6">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)] lg:gap-10">
          <article>
            <p className="text-[11px] leading-[1.4] text-muted">{source.name}</p>
            <h1 className="mt-2 text-[32px] font-bold leading-[1.2] text-ink">{article.title}</h1>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] leading-[1.6] text-muted">
                {source.name}
                <span aria-hidden="true"> · </span>
                <time dateTime={toDateTimeAttr(article.published_at)}>{formatDate(article.published_at)}</time>
                <span aria-hidden="true"> · </span>
                {readTime(article.raw_text)}
                {isHttpUrl(originalUrl) ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    <OriginalArticleLink
                      articleId={article.id}
                      sourceName={source.name}
                      href={originalUrl}
                    />
                  </>
                ) : null}
              </p>
              <ArticleActions articleId={article.id} sourceName={source.name} />
            </div>

            <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-lg bg-panel-muted">
              {isHttpsUrl(article.image_url) ? (
                <Image
                  src={article.image_url}
                  alt={article.title}
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 1024px) 760px, 100vw"
                  className="object-cover"
                />
              ) : null}
            </div>

            <div className="mt-5">
              <h2 className="text-[13px] font-medium leading-none text-ink">Bias Distribution</h2>
              <div className="mt-2">
                <BiasMeter
                  left={analysis.left_percentage}
                  center={analysis.center_percentage}
                  right={analysis.right_percentage}
                  size="meter"
                  widths="exact"
                />
              </div>
              <p className="mt-2 text-[11px] leading-[1.4] text-muted">
                AI-estimated framing · {formatConfidence(analysis.confidence)}
              </p>
            </div>

            <div className="mt-6 max-w-[68ch] space-y-4 text-[16px] leading-[1.6] text-ink">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <RelatedStories items={related} />
          </article>

          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-line bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold leading-[1.4] text-ink">Bias Analysis</h2>
                <button
                  type="button"
                  aria-label="About this estimate"
                  className="inline-flex size-5 items-center justify-center rounded-full text-muted"
                >
                  <Info className="size-3.5" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-4 text-[11px] leading-[1.4] text-muted">AI-estimated framing</p>
              <p className={`text-[20px] font-semibold leading-[1.3] ${labelClass(analysis.bias_label)}`}>
                {labelText(analysis.bias_label)}
                {share !== null ? ` ${share}%` : null}
              </p>
              <p className="mt-1 text-[11px] leading-[1.4] text-muted">{formatConfidence(analysis.confidence)}</p>
              <BiasRows
                rows={[
                  { label: "Left", percent: analysis.left_percentage, fillClassName: "bg-bias-left" },
                  { label: "Center", percent: analysis.center_percentage, fillClassName: "bg-bias-center" },
                  { label: "Right", percent: analysis.right_percentage, fillClassName: "bg-bias-right" },
                ]}
              />
              <p className="mt-4 text-[13px] leading-[1.6] text-muted">{analysis.disclaimer}</p>
              <BiasMethodologyButton articleId={article.id} biasLabel={analysis.bias_label} />
            </section>

            <section className="rounded-lg border border-line bg-panel p-4">
              <h2 className="text-[16px] font-semibold leading-[1.4] text-ink">Sentiment</h2>
              <p className="mt-3 text-[20px] font-semibold leading-[1.3] text-ink">
                {labelText(analysis.sentiment_label)}
              </p>
              <p className="mt-1 text-[11px] leading-[1.4] text-muted">
                Score {formatSentimentScore(analysis.sentiment_score)} on a −1 to 1 scale
              </p>
            </section>

            <section className="rounded-lg border border-line bg-panel p-4">
              <h2 className="text-[16px] font-semibold leading-[1.4] text-ink">AI Summary</h2>
              <p className="mt-1 text-[11px] leading-[1.4] text-muted">
                Generated {formatDate(analysis.created_at)} · {readTime(analysis.summary)}
              </p>
              <div className="mt-3 space-y-2 text-[14px] leading-[1.6] text-ink">
                {summary.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-[1.4] text-muted italic">AI summaries can make mistakes.</p>
            </section>

            <section className="rounded-lg border border-line bg-panel p-4">
              <h2 className="text-[16px] font-semibold leading-[1.4] text-ink">Framing Notes</h2>
              {analysis.framing_notes.length > 0 ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-[1.6] text-ink">
                  {analysis.framing_notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] leading-[1.6] text-muted">No framing notes for this article.</p>
              )}
            </section>

            <section className="rounded-lg border border-line bg-panel p-4">
              <h2 className="text-[16px] font-semibold leading-[1.4] text-ink">Loaded Terms</h2>
              {analysis.loaded_terms.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {analysis.loaded_terms.map((term, index) => (
                    <li key={index}>
                      <span className="inline-flex h-7 items-center rounded-full border border-line bg-panel px-2.5 text-[13px] font-medium text-ink">
                        {term}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] leading-[1.6] text-muted">No loaded terms detected.</p>
              )}
            </section>
          </aside>
        </div>
        <NewsletterForm />
      </main>
      <SiteFooter />
    </div>
  );
}
