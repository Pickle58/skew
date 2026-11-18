import "server-only";
import { URL_EXISTENCE_CHUNK_SIZE } from "@/lib/limits";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { chunk, queryError, uniqueNonEmpty } from "@/lib/supabase/queries/shared";
import type { Json, OxylabsScheduleRow, SourceRow } from "@/lib/supabase/types";

export type OxylabsScheduleWithSource = OxylabsScheduleRow & {
  source: Pick<SourceRow, "id" | "name" | "listing_url"> | null;
};

type ScheduleUpsert = {
  source_id: string;
  schedule_id: string;
  cron_expression: string;
  is_active?: boolean;
};

type ScheduleRunRecord = {
  schedule_id: string;
  oxylabs_run_id?: string | null;
  oxylabs_job_id: string;
  result_status: string;
  processed_at?: string | null;
  summary?: Json | null;
};

export async function listOxylabsSchedules(): Promise<OxylabsScheduleWithSource[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("oxylabs_schedules")
    .select("*, source:sources(id, name, listing_url)")
    .order("created_at", { ascending: true });
  if (error) throw queryError("listOxylabsSchedules", error);
  return data;
}

export async function upsertOxylabsSchedule(row: ScheduleUpsert): Promise<OxylabsScheduleRow> {
  const { data, error } = await getSupabaseAdmin()
    .from("oxylabs_schedules")
    .upsert(row, { onConflict: "source_id" })
    .select()
    .single();
  if (error) throw queryError("upsertOxylabsSchedule", error);
  return data;
}

export async function listStoredScheduleIds(): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin().from("oxylabs_schedules").select("schedule_id");
  if (error) throw queryError("listStoredScheduleIds", error);
  return data.map((row) => row.schedule_id);
}

export async function findProcessedJobIds(jobIds: string[]): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const processed = new Set<string>();

  for (const idChunk of chunk(uniqueNonEmpty(jobIds), URL_EXISTENCE_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("oxylabs_schedule_runs")
      .select("oxylabs_job_id")
      .in("oxylabs_job_id", idChunk)
      .not("processed_at", "is", null);
    if (error) throw queryError("findProcessedJobIds", error);
    for (const row of data) processed.add(row.oxylabs_job_id);
  }

  return processed;
}

export async function recordScheduleRun(row: ScheduleRunRecord): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("oxylabs_schedule_runs")
    .upsert(row, { onConflict: "oxylabs_job_id" });
  if (error) throw queryError("recordScheduleRun", error);
}
