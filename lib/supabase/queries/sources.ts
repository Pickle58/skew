import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { queryError } from "@/lib/supabase/queries/shared";
import type { SourceRow } from "@/lib/supabase/types";

type ActiveSourceFilter = {
  ids?: string[];
  names?: string[];
};

export async function listSources(): Promise<SourceRow[]> {
  const { data, error } = await getSupabaseAdmin().from("sources").select("*").order("name");
  if (error) throw queryError("listSources", error);
  return data;
}

export async function listActiveSources(filter: ActiveSourceFilter = {}): Promise<SourceRow[]> {
  let query = getSupabaseAdmin().from("sources").select("*").eq("is_active", true).order("name");
  if (filter.ids && filter.ids.length > 0) {
    query = query.in("id", filter.ids);
  }
  const { data, error } = await query;
  if (error) throw queryError("listActiveSources", error);

  if (!filter.names || filter.names.length === 0) {
    return data;
  }
  const wanted = new Set(filter.names.map((name) => name.trim().toLowerCase()));
  return data.filter((source) => wanted.has(source.name.toLowerCase()));
}
