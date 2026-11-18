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

function expiresAtIso(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString();
}

async function readLock(key: PipelineLockKey) {
  const { data, error } = await getSupabaseAdmin()
    .from("pipeline_locks")
    .select("key, holder, expires_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw queryError("readPipelineLock", error);
  return data;
}

async function isHeld(key: PipelineLockKey): Promise<boolean> {
  const row = await readLock(key);
  if (!row) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

async function clearExpired(key: PipelineLockKey): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("pipeline_locks")
    .delete()
    .eq("key", key)
    .lt("expires_at", new Date().toISOString());
  if (error) throw queryError("clearExpiredPipelineLock", error);
}

export async function tryAcquirePipelineLock(
  key: PipelineLockKey,
  options: { ttlMs?: number; holder?: string } = {},
): Promise<PipelineLockHandle | null> {
  const ttlMs = options.ttlMs ?? PIPELINE_LOCK_TTL_MS;
  const holder = options.holder ?? `${key}-${randomUUID()}`;
  const supabase = getSupabaseAdmin();

  if (key === "cron") {
    if ((await isHeld("scrape")) || (await isHeld("analyze"))) {
      return null;
    }
  } else if (await isHeld("cron")) {
    return null;
  }

  await clearExpired(key);

  const existing = await readLock(key);
  if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
    return null;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("pipeline_locks")
      .update({ holder, expires_at: expiresAtIso(ttlMs) })
      .eq("key", key)
      .eq("holder", existing.holder)
      .select("key")
      .maybeSingle();
    if (error) throw queryError("tryAcquirePipelineLock.update", error);
    if (!data) return null;
    return { key, holder };
  }

  const { error } = await supabase.from("pipeline_locks").insert({
    key,
    holder,
    expires_at: expiresAtIso(ttlMs),
  });
  if (error) {
    if (error.code === "23505") return null;
    throw queryError("tryAcquirePipelineLock.insert", error);
  }
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
