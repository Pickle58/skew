import { describe, expect, it } from "vitest";
import {
  expectedFramingLabel,
  expectedSentimentLabel,
  validateAnalysisConsistency,
} from "@/lib/ai/analysis-validation";

describe("expectedSentimentLabel", () => {
  it("maps score bands", () => {
    expect(expectedSentimentLabel(0.5)).toBe("positive");
    expect(expectedSentimentLabel(-0.5)).toBe("negative");
    expect(expectedSentimentLabel(0)).toBe("neutral");
  });
});

describe("expectedFramingLabel", () => {
  it("uses strongest side when gap is clear", () => {
    expect(
      expectedFramingLabel({ leftPercentage: 60, centerPercentage: 30, rightPercentage: 10 }, 0.8),
    ).toBe("left");
  });

  it("returns mixed when top two are close", () => {
    expect(
      expectedFramingLabel({ leftPercentage: 40, centerPercentage: 35, rightPercentage: 25 }, 0.8),
    ).toBe("mixed");
  });

  it("returns unclear when confidence is low", () => {
    expect(
      expectedFramingLabel({ leftPercentage: 70, centerPercentage: 20, rightPercentage: 10 }, 0.2),
    ).toBe("unclear");
  });
});

describe("validateAnalysisConsistency", () => {
  it("flags mismatched sentiment and framing", () => {
    const issues = validateAnalysisConsistency({
      sentimentScore: 0.8,
      sentimentLabel: "negative",
      leftPercentage: 70,
      centerPercentage: 20,
      rightPercentage: 10,
      confidence: 0.9,
      politicalFramingLabel: "right",
    });
    expect(issues.length).toBe(2);
  });

  it("accepts consistent output", () => {
    const issues = validateAnalysisConsistency({
      sentimentScore: 0.5,
      sentimentLabel: "positive",
      leftPercentage: 60,
      centerPercentage: 30,
      rightPercentage: 10,
      confidence: 0.8,
      politicalFramingLabel: "left",
    });
    expect(issues).toEqual([]);
  });
});
