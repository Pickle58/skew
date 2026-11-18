"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { formatDate, isHttpsUrl, toDateTimeAttr } from "@/lib/format";
import type { RelatedArticle } from "@/lib/supabase/types";

type RelatedStoriesProps = {
  items: RelatedArticle[];
};

export function RelatedStories({ items }: RelatedStoriesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-[24px] font-semibold leading-[1.3] text-ink">Related Stories</h2>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        {items.map((story) => (
          <li key={story.id} className="min-w-0">
            <article className="flex gap-3">
              <div className="relative aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-md bg-panel-muted">
                {isHttpsUrl(story.image_url) ? (
                  <Image src={story.image_url} alt="" fill unoptimized sizes="96px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] leading-[1.4] text-muted">{story.source_name}</p>
                <h3 className="mt-0.5 text-[16px] font-semibold leading-[1.35] text-ink">
                  <Link
                    href={`/news/${story.id}`}
                    className="hover:text-bias-right"
                    onClick={() =>
                      posthog.capture("related_article_opened", {
                        article_id: story.id,
                        source_name: story.source_name,
                      })
                    }
                  >
                    {story.title}
                  </Link>
                </h3>
                <p className="mt-1 text-[11px] leading-[1.4] text-muted">
                  <time dateTime={toDateTimeAttr(story.published_at)}>{formatDate(story.published_at)}</time>
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
