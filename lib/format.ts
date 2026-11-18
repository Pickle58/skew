import type { BiasLabel, SentimentLabel } from "@/lib/supabase/types";

const WORDS_PER_MINUTE = 230;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function toDateTimeAttr(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function readTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}% confidence`;
}

export function formatSentimentScore(score: number): string {
  return `${score > 0 ? "+" : ""}${score.toFixed(2)}`;
}

export function labelText(label: BiasLabel | SentimentLabel): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function splitParagraphs(text: string): string[] {
  const clean = (parts: string[]) => parts.map((part) => part.trim()).filter(Boolean);
  const blocks = clean(text.split(/\n\s*\n/));
  return blocks.length > 1 ? blocks : clean(text.split("\n"));
}

function hasProtocol(url: string | null, protocols: readonly string[]): url is string {
  if (!url) return false;
  try {
    return protocols.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function isHttpsUrl(url: string | null): url is string {
  return hasProtocol(url, ["https:"]);
}

export function isHttpUrl(url: string | null): url is string {
  return hasProtocol(url, ["http:", "https:"]);
}
