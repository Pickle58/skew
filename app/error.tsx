"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[1.2] text-ink">We couldn&apos;t load stories right now.</h1>
      <p className="mt-3 text-[16px] leading-[1.6] text-muted">Please try again in a moment.</p>
      <Button
        appearance="outline"
        className="mt-6"
        onClick={() => {
          posthog.capture("error_retry_clicked", {
            digest: error.digest ?? null,
          });
          reset();
        }}
      >
        Retry
      </Button>
    </main>
  );
}
