"use client";

import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

type AnalysisActionsProps = {
  articleId: string;
  biasLabel: string;
};

export function BiasMethodologyButton({ articleId, biasLabel }: AnalysisActionsProps) {
  return (
    <Button
      appearance="outline"
      className="mt-4 w-full"
      onClick={() =>
        posthog.capture("bias_methodology_clicked", {
          article_id: articleId,
          bias_label: biasLabel,
        })
      }
    >
      How We Analyze Bias
    </Button>
  );
}

export function AnalysisFeedbackButton({ articleId }: { articleId: string }) {
  return (
    <Button
      appearance="outline"
      className="mt-4"
      onClick={() =>
        posthog.capture("analysis_feedback_clicked", {
          article_id: articleId,
        })
      }
    >
      Provide Feedback
    </Button>
  );
}
