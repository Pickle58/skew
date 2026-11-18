import { connection } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/api/admin-auth";
import { listActiveSources } from "@/lib/supabase/queries/sources";

export async function GET(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connection();
  try {
    const sources = await listActiveSources();
    return Response.json({
      sources: sources.map(({ id, name, listing_url, parser_strategy }) => ({
        id,
        name,
        listing_url,
        parser_strategy,
      })),
    });
  } catch (error) {
    console.error("[sources] list failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Failed to load sources" }, { status: 500 });
  }
}
