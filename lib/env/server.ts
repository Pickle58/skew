import "server-only";
import { DEFAULT_ANALYSIS_BATCH_SIZE, MAX_ANALYSIS_BATCH_SIZE } from "@/lib/limits";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getOxylabsApiKey(): string {
  return required("OXYLABS_WEB_API_KEY");
}

export function getAdminSecret(): string | null {
  return process.env.SKEW_ADMIN_SECRET || null;
}

export function getCronSecret(): string | null {
  return process.env.CRON_SECRET || null;
}

export function getOpenAIApiKey(): string {
  return required("OPENAI_API_KEY");
}

export function getAnalysisBatchSize(): number {
  const raw = process.env.ANALYSIS_BATCH_SIZE;
  if (!raw) return DEFAULT_ANALYSIS_BATCH_SIZE;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ANALYSIS_BATCH_SIZE) {
    console.warn("[analyze] ANALYSIS_BATCH_SIZE is invalid; using the default");
    return DEFAULT_ANALYSIS_BATCH_SIZE;
  }
  return parsed;
}
