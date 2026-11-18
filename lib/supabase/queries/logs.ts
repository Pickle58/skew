import "server-only";
import { MAX_LOG_PAGE_SIZE } from "@/lib/limits";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { queryError } from "@/lib/supabase/queries/shared";
import {
  toLogLevel,
  toLogScope,
  type Json,
  type LogLevel,
  type LogRow,
  type LogScope,
} from "@/lib/supabase/types";

const DEFAULT_LOG_PAGE_SIZE = 50;

type LogEntry = {
  level: LogLevel;
  scope: LogScope;
  message: string;
  context?: { [key: string]: Json | undefined };
};

export async function insertLog(entry: LogEntry): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin().from("logs").insert({
      level: entry.level,
      scope: entry.scope,
      message: entry.message,
      context: entry.context ?? {},
    });
    if (error) {
      console.error("[logs] insertLog failed:", error.message);
    }
  } catch (error) {
    console.error("[logs] insertLog failed:", error instanceof Error ? error.message : "unknown error");
  }
}

export async function listLogs(
  options: { scope?: LogScope; level?: LogLevel; limit?: number } = {},
): Promise<LogRow[]> {
  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LOG_PAGE_SIZE), MAX_LOG_PAGE_SIZE);
  let query = getSupabaseAdmin().from("logs").select("*");
  if (options.scope) query = query.eq("scope", options.scope);
  if (options.level) query = query.eq("level", options.level);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw queryError("listLogs", error);

  return data.map((row) => ({ ...row, level: toLogLevel(row.level), scope: toLogScope(row.scope) }));
}
