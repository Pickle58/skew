"use client";

import type { ReactNode } from "react";
import { Bookmark, MoreHorizontal, Share2 } from "lucide-react";
import posthog from "posthog-js";

type ArticleActionsProps = {
  articleId: string;
  sourceName: string;
};

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-[13px] font-medium text-ink"
    >
      {children}
      {label}
    </button>
  );
}

export function OriginalArticleLink({
  articleId,
  sourceName,
  href,
}: {
  articleId: string;
  sourceName: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ink underline-offset-2 hover:underline"
      onClick={() =>
        posthog.capture("original_article_opened", {
          article_id: articleId,
          source_name: sourceName,
        })
      }
    >
      Read original
    </a>
  );
}

export function ArticleActions({ articleId, sourceName }: ArticleActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <IconButton
        label="Save"
        onClick={() =>
          posthog.capture("article_saved", {
            article_id: articleId,
            source_name: sourceName,
          })
        }
      >
        <Bookmark className="size-3.5" strokeWidth={2} aria-hidden="true" />
      </IconButton>
      <IconButton
        label="Share"
        onClick={() =>
          posthog.capture("article_shared", {
            article_id: articleId,
            source_name: sourceName,
          })
        }
      >
        <Share2 className="size-3.5" strokeWidth={2} aria-hidden="true" />
      </IconButton>
      <button
        type="button"
        aria-label="More"
        className="inline-flex size-8 items-center justify-center rounded-full border border-line bg-panel text-ink"
      >
        <MoreHorizontal className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
