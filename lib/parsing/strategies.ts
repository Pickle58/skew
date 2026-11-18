export const PARSER_STRATEGY_NAMES = ["reuters", "npr", "foxnews", "bbc", "guardian", "generic"] as const;
export type ParserStrategyName = (typeof PARSER_STRATEGY_NAMES)[number];

export type ParserStrategy = {
  name: ParserStrategyName;
  render: boolean;
  cardLinkSelectors: readonly string[];
  excludeContainerSelectors: readonly string[];
  isArticlePath: (pathname: string) => boolean;
  bodySelectors: readonly string[];
  bodyNoiseSelectors: readonly string[];
};

const GENERIC_CARD_LINK_SELECTORS = [
  "main a[href]",
  "article a[href]",
  "h2 a[href]",
  "h3 a[href]",
  "h4 a[href]",
  '[class*="card" i] a[href]',
  '[class*="story" i] a[href]',
  '[data-testid*="card" i] a[href]',
] as const;

const GENERIC_EXCLUDE_CONTAINERS = [
  "nav",
  "footer",
  "body > header",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[class*="newsletter" i]',
  '[class*="footer" i]',
] as const;

const GENERIC_BODY_SELECTORS = ['[itemprop="articleBody"] p', "article p", "main p"] as const;

const DATE_SEGMENT = /\/\d{4}\/(\d{2}|[a-z]{3})\/\d{2}\//;
const DATE_SUFFIX = /-\d{4}-\d{2}-\d{2}$/;

function slugWordCount(pathname: string): number {
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[segments.length - 1] ?? "";
  return slug.split("-").filter(Boolean).length;
}

function segmentCount(pathname: string): number {
  return pathname.split("/").filter(Boolean).length;
}

const reuters: ParserStrategy = {
  name: "reuters",
  render: false,
  cardLinkSelectors: [...GENERIC_CARD_LINK_SELECTORS, '[data-testid="Heading"] a[href]', '[data-testid="Title"] a[href]'],
  excludeContainerSelectors: GENERIC_EXCLUDE_CONTAINERS,
  isArticlePath: (pathname) =>
    /^\/(?:[a-z0-9-]+\/){1,3}[a-z0-9]+(?:-[a-z0-9]+){2,}-\d{4}-\d{2}-\d{2}$/.test(pathname) &&
    !/-clone-\d{4}-\d{2}-\d{2}$/.test(pathname),
  bodySelectors: ['[data-testid^="paragraph-"]', '[class*="article-body" i] p', ...GENERIC_BODY_SELECTORS],
  bodyNoiseSelectors: ['[data-testid="Body"] [class*="sign-up" i]', '[class*="trust-badge" i]'],
};

const npr: ParserStrategy = {
  name: "npr",
  render: false,
  cardLinkSelectors: [...GENERIC_CARD_LINK_SELECTORS, ".story-text a[href]", ".title a[href]"],
  excludeContainerSelectors: GENERIC_EXCLUDE_CONTAINERS,
  isArticlePath: (pathname) => /^\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(pathname),
  bodySelectors: ["#storytext > p", ".storytext > p", ...GENERIC_BODY_SELECTORS],
  bodyNoiseSelectors: [".bucketwrap", ".caption", ".credit", ".enlarge-options", ".hide-caption"],
};

const foxnews: ParserStrategy = {
  name: "foxnews",
  render: false,
  cardLinkSelectors: [...GENERIC_CARD_LINK_SELECTORS, ".title a[href]", ".info a[href]"],
  excludeContainerSelectors: GENERIC_EXCLUDE_CONTAINERS,
  isArticlePath: (pathname) => /^\/[a-z0-9-]+\/[a-z0-9]+(?:-[a-z0-9]+){3,}$/.test(pathname),
  bodySelectors: [".article-body > p", ".article-body p", ...GENERIC_BODY_SELECTORS],
  bodyNoiseSelectors: [".caption", ".featured-video", ".ad-container", ".vendor-unit", ".article-gating-wrapper"],
};

const bbc: ParserStrategy = {
  name: "bbc",
  render: false,
  cardLinkSelectors: [...GENERIC_CARD_LINK_SELECTORS, '[data-testid*="promo" i] a[href]', '[data-testid="internal-link"]'],
  excludeContainerSelectors: GENERIC_EXCLUDE_CONTAINERS,
  isArticlePath: (pathname) =>
    /^\/news\/articles\/[a-z0-9]{8,}$/.test(pathname) || /^\/news\/[a-z-]+-\d{6,}$/.test(pathname),
  bodySelectors: ['[data-component="text-block"] p', ...GENERIC_BODY_SELECTORS],
  bodyNoiseSelectors: ['[data-component="links-block"]', '[data-component="image-block"]', '[data-component="caption-block"]'],
};

const guardian: ParserStrategy = {
  name: "guardian",
  render: false,
  cardLinkSelectors: [...GENERIC_CARD_LINK_SELECTORS, '[data-link-name="article"]', "a[data-link-name]"],
  excludeContainerSelectors: GENERIC_EXCLUDE_CONTAINERS,
  isArticlePath: (pathname) =>
    /^\/[a-z-]+(?:\/[a-z-]+)?\/\d{4}\/[a-z]{3}\/\d{2}\/[a-z0-9-]+$/.test(pathname),
  bodySelectors: ['[data-gu-name="body"] p', "#maincontent p", ...GENERIC_BODY_SELECTORS],
  bodyNoiseSelectors: ["figure", "gu-island", '[data-spacefinder-role="supporting"]'],
};

const generic: ParserStrategy = {
  name: "generic",
  render: false,
  cardLinkSelectors: GENERIC_CARD_LINK_SELECTORS,
  excludeContainerSelectors: GENERIC_EXCLUDE_CONTAINERS,
  isArticlePath: (pathname) =>
    segmentCount(pathname) >= 2 &&
    (DATE_SEGMENT.test(`${pathname}/`) || DATE_SUFFIX.test(pathname) || slugWordCount(pathname) >= 5),
  bodySelectors: GENERIC_BODY_SELECTORS,
  bodyNoiseSelectors: [],
};

function isStrategyName(value: string): value is ParserStrategyName {
  return PARSER_STRATEGY_NAMES.some((name) => name === value);
}

function strategyFor(name: ParserStrategyName): ParserStrategy {
  switch (name) {
    case "reuters":
      return reuters;
    case "npr":
      return npr;
    case "foxnews":
      return foxnews;
    case "bbc":
      return bbc;
    case "guardian":
      return guardian;
    case "generic":
      return generic;
    default: {
      const exhaustive: never = name;
      return exhaustive;
    }
  }
}

export function getParserStrategy(name: string): ParserStrategy {
  const normalized = name.trim().toLowerCase();
  if (isStrategyName(normalized)) {
    return strategyFor(normalized);
  }
  console.warn(`[scrape] unknown parser_strategy "${name}", using generic`);
  return generic;
}
