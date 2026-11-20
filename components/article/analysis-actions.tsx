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
