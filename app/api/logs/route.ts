import { connection } from "next/server";
import { z } from "zod";
import { MAX_LOG_PAGE_SIZE } from "@/lib/limits";
import { listLogs } from "@/lib/supabase/queries/logs";
import { LOG_LEVELS, LOG_SCOPES } from "@/lib/supabase/types";

const logsQuerySchema = z.object({
  scope: z.enum(LOG_SCOPES).optional(),
  level: z.enum(LOG_LEVELS).optional(),
  limit: z.number().int().min(1).max(MAX_LOG_PAGE_SIZE).optional(),
});

function readParam(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name);
  if (value === null || value.trim().length === 0) return undefined;
  return value;
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const limitRaw = readParam(url, "limit");
  const parsed = logsQuerySchema.safeParse({
    scope: readParam(url, "scope"),
    level: readParam(url, "level"),
    limit: limitRaw === undefined ? undefined : Number(limitRaw),
  });
  if (!parsed.success) {
    return Response.json({ error: "Invalid query", issues: z.treeifyError(parsed.error) }, { status: 400 });
  }

  try {
    const logs = await listLogs(parsed.data);
    return Response.json({ logs });
  } catch (error) {
    console.error("[logs] list failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Failed to load logs" }, { status: 500 });
  }
}
