"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { Info } from "lucide-react";
import { BiasMeter } from "@/components/ui/bias-meter";
import { formatConfidence, formatDate, isHttpsUrl, labelText, toDateTimeAttr } from "@/lib/format";
import type { ArticleCard } from "@/lib/supabase/types";

type NewsCardProps = {
  article: ArticleCard;
};

export function NewsCard({ article }: NewsCardProps) {
  const href = `/news/${article.id}`;
  const { analysis } = article;

  function captureArticleOpened() {
    posthog.capture("article_opened", {
      article_id: article.id,
      source_name: article.source.name,
      bias_label: analysis.bias_label,
    });
  }

  return (
    <article className="flex h-full flex-col rounded-lg border border-line bg-panel p-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-panel-muted">
        {isHttpsUrl(article.image_url) ? (
          <Link href={href} className="absolute inset-0" tabIndex={-1} aria-hidden="true" onClick={captureArticleOpened}>
            <Image
              src={article.image_url}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 380px, (min-width: 640px) 46vw, 100vw"
              className="object-cover"
            />
          </Link>
        ) : null}
        <button
          type="button"
          aria-label="About this estimate"
          className="absolute top-1 right-1 z-10 flex size-9 items-center justify-center rounded-full bg-panel text-ink shadow-sm"
        >
          <Info className="size-3" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-[1.4] text-muted">
        {article.source.name}
        <span aria-hidden="true"> · </span>
        <time dateTime={toDateTimeAttr(article.published_at)}>{formatDate(article.published_at)}</time>
      </p>
      <h2 className="mt-1 text-[16px] font-semibold leading-[1.35] text-ink">
        <Link href={href} className="hover:text-bias-right" onClick={captureArticleOpened}>
          {article.title}
        </Link>
      </h2>
      <div className="mt-3">
        <BiasMeter
          left={analysis.left_percentage}
          center={analysis.center_percentage}
          right={analysis.right_percentage}
          size="card"
          labels="compact"
        />
      </div>
      <p className="mt-2 text-[11px] leading-[1.4] text-muted">
        AI-estimated · {labelText(analysis.bias_label)} framing · {labelText(analysis.sentiment_label)} sentiment ·{" "}
        {formatConfidence(analysis.confidence)}
      </p>
    </article>
  );
}
