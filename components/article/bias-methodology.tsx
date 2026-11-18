"use client";

import { createContext, useContext, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { Info } from "lucide-react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { ANALYSIS_DISCLAIMER } from "@/lib/analysis-copy";

type BiasMethodologyContextValue = {
  open: () => void;
};

const BiasMethodologyContext = createContext<BiasMethodologyContextValue | null>(null);

function useBiasMethodology() {
  const value = useContext(BiasMethodologyContext);
  if (!value) {
    throw new Error("Bias methodology controls must be used within BiasMethodology.");
  }
  return value;
}

type BiasMethodologyProps = {
  articleId: string;
  biasLabel: string;
  children: ReactNode;
};

export function BiasMethodology({ articleId, biasLabel, children }: BiasMethodologyProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  function open() {
    posthog.capture("bias_methodology_clicked", {
      article_id: articleId,
      bias_label: biasLabel,
    });
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      close();
    }
  }

  return (
    <BiasMethodologyContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={onDialogClick}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-panel p-5 text-ink shadow-lg backdrop:bg-black/40"
      >
        <h2 id={titleId} className="text-[16px] font-semibold leading-[1.4] text-ink">
          How We Analyze Bias
        </h2>
        <div className="mt-3 space-y-3 text-[14px] leading-[1.6] text-ink">
          <p>
            Skew’s AI reads this article’s title and body text only. It does not score the outlet by
            reputation or assume a lean from the source name.
          </p>
          <p>
            It estimates left, center, and right framing shares that add up to 100%, then assigns a
            label: left, center, right, mixed, or unclear. Mixed is used when sides are close;
            unclear when the text does not support a clear estimate.
          </p>
          <p>
            Confidence reflects how strongly the text supports that estimate. Framing notes and
            loaded terms call out slanted phrasing grounded in the article itself.
          </p>
          <p className="text-muted">{ANALYSIS_DISCLAIMER}</p>
        </div>
        <div className="mt-5 flex justify-end">
          <Button appearance="outline" onClick={close}>
            Close
          </Button>
        </div>
      </dialog>
    </BiasMethodologyContext.Provider>
  );
}

export function BiasMethodologyInfoButton() {
  const { open } = useBiasMethodology();

  return (
    <button
      type="button"
      aria-label="About this estimate"
      className="inline-flex size-5 items-center justify-center rounded-full text-muted hover:text-ink"
      onClick={open}
    >
      <Info className="size-3.5" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

export function BiasMethodologyButton() {
  const { open } = useBiasMethodology();

  return (
    <Button appearance="outline" className="mt-4 w-full" onClick={open}>
      How We Analyze Bias
    </Button>
  );
}
