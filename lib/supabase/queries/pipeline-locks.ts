import "server-only";
import { randomUUID } from "node:crypto";
import { PIPELINE_LOCK_TTL_MS } from "@/lib/limits";
import { queryError } from "@/lib/supabase/queries/shared";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type PipelineLockKey = "cron" | "scrape" | "analyze";

export type PipelineLockHandle = {
  key: PipelineLockKey;
  holder: string;
};

export async function tryAcquirePipelineLock(
  key: PipelineLockKey,
  options: { ttlMs?: number; holder?: string } = {},
): Promise<PipelineLockHandle | null> {
  const ttlMs = options.ttlMs ?? PIPELINE_LOCK_TTL_MS;
  const holder = options.holder ?? `${key}-${randomUUID()}`;

  const { data, error } = await getSupabaseAdmin().rpc("try_acquire_pipeline_lock", {
    p_key: key,
    p_holder: holder,
    p_ttl_ms: ttlMs,
  });
  if (error) throw queryError("tryAcquirePipelineLock", error);
  if (!data) return null;
  return { key, holder };
}

export async function releasePipelineLock(handle: PipelineLockHandle): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("pipeline_locks")
    .delete()
    .eq("key", handle.key)
    .eq("holder", handle.holder);
  if (error) throw queryError("releasePipelineLock", error);
}
