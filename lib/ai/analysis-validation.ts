import type { BiasLabel, SentimentLabel } from "@/lib/supabase/types";

export type FramingPercentages = {
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
};

const SENTIMENT_POSITIVE_MIN = 0.2;
const SENTIMENT_NEGATIVE_MAX = -0.2;
const CLOSE_PERCENTAGE_GAP = 10;
const LOW_CONFIDENCE = 0.4;

export function expectedSentimentLabel(score: number): SentimentLabel {
  if (score >= SENTIMENT_POSITIVE_MIN) return "positive";
  if (score <= SENTIMENT_NEGATIVE_MAX) return "negative";
  return "neutral";
}

export function sentimentLabelMatchesScore(score: number, label: SentimentLabel): boolean {
  return expectedSentimentLabel(score) === label;
}

export function strongestFramingSide(percentages: FramingPercentages): "left" | "center" | "right" {
  const entries = [
    ["left", percentages.leftPercentage],
    ["center", percentages.centerPercentage],
    ["right", percentages.rightPercentage],
  ] as const;
  return entries.reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}

export function expectedFramingLabel(
  percentages: FramingPercentages,
  confidence: number,
): BiasLabel {
  if (confidence < LOW_CONFIDENCE) {
    return "unclear";
  }

  const ranked = [
    percentages.leftPercentage,
    percentages.centerPercentage,
    percentages.rightPercentage,
  ].sort((a, b) => b - a);
  const top = ranked[0] ?? 0;
  const second = ranked[1] ?? 0;
  if (top - second <= CLOSE_PERCENTAGE_GAP) {
    return "mixed";
  }
  return strongestFramingSide(percentages);
}

export function framingLabelMatches(
  percentages: FramingPercentages,
  confidence: number,
  label: BiasLabel,
): boolean {
  return expectedFramingLabel(percentages, confidence) === label;
}

export function validateAnalysisConsistency(input: {
  sentimentScore: number;
  sentimentLabel: SentimentLabel;
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
  confidence: number;
  politicalFramingLabel: BiasLabel;
}): string[] {
  const issues: string[] = [];
  if (!sentimentLabelMatchesScore(input.sentimentScore, input.sentimentLabel)) {
    issues.push(
      `sentimentLabel ${input.sentimentLabel} does not match sentimentScore ${input.sentimentScore}`,
    );
  }
  if (
    !framingLabelMatches(
      {
        leftPercentage: input.leftPercentage,
        centerPercentage: input.centerPercentage,
        rightPercentage: input.rightPercentage,
      },
      input.confidence,
      input.politicalFramingLabel,
    )
  ) {
    issues.push(
      `politicalFramingLabel ${input.politicalFramingLabel} does not match percentages/confidence`,
    );
  }
  return issues;
}
