import "server-only";
import {
  DEFAULT_ANALYSIS_BATCH_SIZE,
  MAX_ANALYSIS_BATCH_SIZE,
  MIN_ADMIN_SECRET_LENGTH,
} from "@/lib/limits";

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
  const value = process.env.SKEW_ADMIN_SECRET;
  if (!value) {
    return null;
  }
  if (value.length < MIN_ADMIN_SECRET_LENGTH) {
    console.warn(
      `[auth] SKEW_ADMIN_SECRET must be at least ${MIN_ADMIN_SECRET_LENGTH} characters; treating as unset`,
    );
    return null;
  }
  return value;
}

export function getCronSecret(): string | null {
  return process.env.CRON_SECRET || null;
}

/** Local-only bypass for cron auth. Never enable in production. */
export function isInsecureCronAllowed(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ALLOW_INSECURE_CRON === "1";
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
