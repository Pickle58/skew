"use client";

import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

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
