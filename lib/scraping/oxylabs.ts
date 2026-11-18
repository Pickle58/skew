import "server-only";
import { z } from "zod";
import { getOxylabsApiKey } from "@/lib/env/server";
import { OXYLABS_RENDER_TIMEOUT_MS, OXYLABS_TIMEOUT_MS } from "@/lib/limits";

const SCRAPE_ENDPOINT = "https://webapi.oxylabs.io/v1/scrape";
const RETRY_DELAY_MS = 2_000;

const scrapeResponseSchema = z.object({
  results: z
    .array(
      z.object({
        html: z.string().nullable(),
        metadata: z.object({ url: z.string() }).partial().optional(),
      }),
    )
    .min(1),
  metadata: z.object({ request_id: z.string() }).partial().optional(),
});

export type OxylabsErrorKind = "auth" | "rate_limited" | "http" | "timeout" | "network" | "invalid_response";

export type OxylabsError = {
  kind: OxylabsErrorKind;
  status?: number;
  message: string;
};

export type OxylabsHtmlResult =
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; error: OxylabsError };

type FetchOptions = {
  render?: boolean;
};

function isRetryable(error: OxylabsError): boolean {
  switch (error.kind) {
    case "rate_limited":
    case "timeout":
    case "network":
      return true;
    case "http":
      return error.status !== undefined && error.status >= 500;
    case "auth":
    case "invalid_response":
      return false;
    default: {
      const exhaustive: never = error.kind;
      return exhaustive;
    }
  }
}

function errorFromStatus(status: number): OxylabsError {
  if (status === 401) {
    return { kind: "auth", status, message: "Oxylabs rejected credentials (401)" };
  }
  if (status === 429) {
    return { kind: "rate_limited", status, message: "Oxylabs rate limit or quota exceeded (429)" };
  }
  if (status === 408) {
    return { kind: "timeout", status, message: "Oxylabs scraper timed out (408)" };
  }
  return { kind: "http", status, message: `Oxylabs request failed (${status})` };
}

function networkCode(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  if (typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string") {
    return cause.code;
  }
  return error instanceof Error ? error.name : "unknown";
}

async function readRequestId(response: Response): Promise<string | undefined> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = z.object({ metadata: z.object({ request_id: z.string() }) }).safeParse(body);
  return parsed.success ? parsed.data.metadata.request_id : undefined;
}

async function requestOnce(url: string, render: boolean): Promise<OxylabsHtmlResult> {
  let response: Response;
  try {
    response = await fetch(SCRAPE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${getOxylabsApiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, output: ["html"], ...(render ? { run_js: true } : {}) }),
      signal: AbortSignal.timeout(render ? OXYLABS_RENDER_TIMEOUT_MS : OXYLABS_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { ok: false, error: { kind: "timeout", message: "Oxylabs request timed out" } };
    }
    return { ok: false, error: { kind: "network", message: `Oxylabs request could not be sent (${networkCode(error)})` } };
  }

  if (!response.ok) {
    const error = errorFromStatus(response.status);
    const requestId = response.status === 401 ? undefined : await readRequestId(response);
    return { ok: false, error: requestId ? { ...error, message: `${error.message} [request_id ${requestId}]` } : error };
  }

  const parsed = scrapeResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    return { ok: false, error: { kind: "invalid_response", message: "Unexpected Oxylabs response shape" } };
  }

  const [result] = parsed.data.results;
  if (!result.html) {
    const requestId = parsed.data.metadata?.request_id;
    return {
      ok: false,
      error: { kind: "invalid_response", message: `Oxylabs returned no HTML${requestId ? ` [request_id ${requestId}]` : ""}` },
    };
  }
  return { ok: true, html: result.html, finalUrl: result.metadata?.url ?? url };
}

export async function fetchHtmlViaOxylabs(url: string, options: FetchOptions = {}): Promise<OxylabsHtmlResult> {
  const render = options.render ?? false;
  const first = await requestOnce(url, render);
  if (first.ok || !isRetryable(first.error)) {
    return first;
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return requestOnce(url, render);
}
