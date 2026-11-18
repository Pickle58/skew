import { load } from "cheerio";
import { matchesRejectList } from "@/lib/parsing/reject-list";
import type { ParserStrategy } from "@/lib/parsing/strategies";
import { isSameSite, normalizeUrl } from "@/lib/parsing/url";
import type { UrlRejectionReason } from "@/lib/pipeline/types";

export type RejectedCandidate = {
  url: string;
  reason: UrlRejectionReason;
};

export type CandidateLinks = {
  candidates: string[];
  rejected: RejectedCandidate[];
};

const SKIPPED_HREF = /^(#|mailto:|tel:|javascript:|data:)/i;

export function checkArticleUrl(
  url: string,
  siteUrl: string,
  strategy: ParserStrategy,
): UrlRejectionReason | null {
  if (!isSameSite(url, siteUrl)) {
    return "off_site";
  }
  if (normalizeUrl(siteUrl) === url) {
    return "homepage";
  }
  const { pathname } = new URL(url);
  const rejected = matchesRejectList(pathname);
  if (rejected) {
    return rejected;
  }
  return strategy.isArticlePath(pathname.toLowerCase()) ? null : "not_article_url";
}

export function extractCandidateLinks(html: string, pageUrl: string, strategy: ParserStrategy): CandidateLinks {
  const $ = load(html);
  $(strategy.excludeContainerSelectors.join(", ")).remove();

  const seen = new Set<string>();
  const candidates: string[] = [];
  const rejected: RejectedCandidate[] = [];

  $(strategy.cardLinkSelectors.join(", ")).each((_, element) => {
    const href = $(element).attr("href");
    if (!href || SKIPPED_HREF.test(href.trim())) {
      return;
    }
    const url = normalizeUrl(href, pageUrl);
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);

    const reason = checkArticleUrl(url, pageUrl, strategy);
    if (reason) {
      rejected.push({ url, reason });
    } else {
      candidates.push(url);
    }
  });

  return { candidates, rejected };
}
