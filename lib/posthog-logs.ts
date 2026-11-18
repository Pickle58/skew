import "server-only";
import { SeverityNumber, type Logger } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { after } from "next/server";

type LogAttributes = Record<string, string | number | boolean>;
type LogSeverity = "INFO" | "ERROR";

const SERVICE_NAME = "skew";
const EXPORT_TIMEOUT_MS = 2000;

let loggerProvider: LoggerProvider | null | undefined;
let logger: Logger | null = null;

export function initPostHogLogs(): void {
  if (loggerProvider !== undefined) return;

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!projectToken || !host) {
    loggerProvider = null;
    return;
  }

  const provider = new LoggerProvider({
    resource: resourceFromAttributes({ "service.name": SERVICE_NAME }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: new URL("/i/v1/logs", host).toString(),
          headers: {
            Authorization: `Bearer ${projectToken}`,
            "Content-Type": "application/json",
          },
          timeoutMillis: EXPORT_TIMEOUT_MS,
        }),
        exportTimeoutMillis: EXPORT_TIMEOUT_MS,
      }),
    ],
  });

  loggerProvider = provider;
  logger = provider.getLogger(SERVICE_NAME);
}

export async function emitPostHogLog(
  body: string,
  severity: LogSeverity,
  attributes: LogAttributes,
): Promise<void> {
  initPostHogLogs();
  if (!loggerProvider || !logger) return;

  logger.emit({
    body,
    severityNumber: severity === "ERROR" ? SeverityNumber.ERROR : SeverityNumber.INFO,
    severityText: severity,
    attributes,
  });

  const provider = loggerProvider;
  const flush = () => provider.forceFlush({ timeoutMillis: EXPORT_TIMEOUT_MS }).catch(() => {});

  try {
    after(flush);
  } catch {
    await flush();
  }
}
