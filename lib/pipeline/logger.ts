import "server-only";
import type { RejectionReason } from "@/lib/pipeline/types";

const PREFIX = "[scrape]";

export function logStep(message: string): void {
  console.log(`${PREFIX} ${message}`);
}

export function logWarn(message: string): void {
  console.warn(`${PREFIX} ${message}`);
}

export function logError(message: string): void {
  console.error(`${PREFIX} ${message}`);
}

export class RejectionTally {
  private readonly counts: Partial<Record<RejectionReason, number>> = {};

  add(reason: RejectionReason): void {
    this.counts[reason] = (this.counts[reason] ?? 0) + 1;
  }

  toJSON(): Partial<Record<RejectionReason, number>> {
    return { ...this.counts };
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
