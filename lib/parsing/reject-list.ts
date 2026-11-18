import type { UrlRejectionReason } from "@/lib/pipeline/types";

// Non-article reject list (AGENTS.md section 9), matched against whole path segments.
const SEGMENT_REJECTIONS: ReadonlyArray<readonly [UrlRejectionReason, readonly string[]]> = [
  ["reject_category", ["section", "sections", "category", "categories"]],
  ["reject_topic", ["topic", "topics", "tag", "tags"]],
  ["reject_author", ["author", "authors", "person", "people", "profile", "profiles", "contributors"]],
  ["reject_search", ["search"]],
  [
    "reject_show",
    ["show", "shows", "program", "programs", "programmes", "podcast", "podcasts", "series", "audio", "sounds", "outkick-shows"],
  ],
  ["reject_live", ["live", "live-news", "live-updates", "liveblog"]],
  ["reject_game", ["game", "games", "crossword", "crosswords", "puzzles", "quiz", "quizzes"]],
  [
    "reject_product",
    ["shop", "shopping", "deals", "coupons", "product", "products", "reviews", "thefilter", "thefilter-us", "underscored"],
  ],
  [
    "reject_corporate",
    ["about", "help", "support", "contact", "careers", "jobs", "privacy", "terms", "info", "corrections", "advertise", "press"],
  ],
  [
    "reject_newsletter",
    ["newsletter", "newsletters", "subscribe", "subscription", "signup", "sign-in", "account", "donate"],
  ],
  [
    "reject_video",
    ["video", "videos", "watch", "av", "gallery", "galleries", "picture", "pictures", "ng-interactive", "interactive"],
  ],
];

// Words in the final slug that mark a non-article page even under a normal section path.
const SLUG_TOKEN_REJECTIONS: ReadonlyArray<readonly [UrlRejectionReason, RegExp]> = [
  ["reject_live", /(^|-)live-(updates|blog|news)(-|$)/],
  ["reject_game", /(^|-)(quiz|crossword|puzzle)(-|$)/],
  ["reject_show", /(^|-)podcast(-|$)/],
  ["reject_newsletter", /(^|-)(newsletter|sign-up-for)(-|$)/],
];

export function pathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0);
}

export function matchesRejectList(pathname: string): UrlRejectionReason | null {
  const segments = pathSegments(pathname);
  if (segments.join("").length < 2) {
    return "homepage";
  }

  for (const [reason, words] of SEGMENT_REJECTIONS) {
    if (segments.some((segment) => words.includes(segment))) {
      return reason;
    }
  }

  const slug = segments[segments.length - 1];
  for (const [reason, pattern] of SLUG_TOKEN_REJECTIONS) {
    if (pattern.test(slug)) {
      return reason;
    }
  }
  return null;
}
