const INVISIBLE_CHARS = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;
const LINK_LABELS = /,?\s*opens new tab\b/gi;
const SHORT_PARAGRAPH_CHARS = 40;
const LONG_BLOCK_CHARS = 1_500;
const SENTENCES_PER_PARAGRAPH = 4;

const BOILERPLATE =
  /^(advertisement|ad feedback|read more|load more|sign up|subscribe|share this|follow us|click here|watch:|listen:|related:|recommended|most viewed|most popular|download the app|you can now listen|this story first appeared|copyright|©)/i;
const SENTENCE_END = /[.!?…]["”’)\]]?$/;
const SENTENCE_BOUNDARY = /(?<=[.!?]["”’)]?)\s+(?=["“‘(]?[A-Z0-9])/;

export const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "form",
  "button",
  "figcaption",
  "template",
  '[class*="advert" i]',
  '[class*="ad-slot" i]',
  '[class*="ad-container" i]',
  '[class*="related" i]',
  '[class*="most-viewed" i]',
  '[class*="most-popular" i]',
  '[class*="newsletter" i]',
  '[class*="subscribe" i]',
  '[class*="social" i]',
  '[class*="share-" i]',
  '[class*="sharing" i]',
] as const;

export function normalizeText(value: string): string {
  return value.replace(INVISIBLE_CHARS, "").replace(LINK_LABELS, "").replace(/\s+/g, " ").trim();
}

function looksLikeCode(text: string): boolean {
  return (
    (text.includes("{") && text.includes(":") && text.includes(";")) ||
    /function\s*\(|window\.|document\.|=>\s*\{|var\s+\w+\s*=/.test(text)
  );
}

function isAllCapsPromo(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");
  return letters.length >= 12 && letters === letters.toUpperCase();
}

function isNoise(text: string): boolean {
  if (text.length < SHORT_PARAGRAPH_CHARS && !SENTENCE_END.test(text)) return true;
  if (BOILERPLATE.test(text) || isAllCapsPromo(text)) return true;
  return looksLikeCode(text);
}

function splitLongBlock(text: string): string[] {
  const sentences = text.split(SENTENCE_BOUNDARY).filter((sentence) => sentence.length > 0);
  if (sentences.length <= SENTENCES_PER_PARAGRAPH) {
    return [text];
  }
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
    paragraphs.push(sentences.slice(i, i + SENTENCES_PER_PARAGRAPH).join(" "));
  }
  return paragraphs;
}

export function cleanParagraphs(rawParagraphs: readonly string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of rawParagraphs) {
    const text = normalizeText(raw);
    if (text.length === 0 || seen.has(text) || isNoise(text)) continue;
    seen.add(text);
    cleaned.push(text);
  }

  if (cleaned.length === 1 && cleaned[0].length >= LONG_BLOCK_CHARS) {
    return splitLongBlock(cleaned[0]);
  }
  return cleaned;
}

export function splitTextBlock(text: string): string[] {
  const blocks = text.split(/\n\s*\n|\n/).map(normalizeText).filter(Boolean);
  return cleanParagraphs(blocks);
}

export function isHeadlineLike(paragraph: string): boolean {
  return paragraph.split(" ").length <= 12 && !SENTENCE_END.test(paragraph);
}
