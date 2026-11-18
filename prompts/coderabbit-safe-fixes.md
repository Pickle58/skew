# CodeRabbit safe fixes

## Goal

Apply three still-valid CodeRabbit review findings with minimal diffs and without changing lock conflict policy or route auth behavior.

## Skills read

- `.agents/skills/supabase` (RPC hygiene, schema updates)
- `AGENTS.md` sections 15, 19, 21 (admin secret, abandonment, join-filter gotcha)

## Existing code inspected

- `lib/supabase/queries/pipeline-locks.ts` — multi-step acquire with TOCTOU race
- `lib/supabase/queries/articles.ts` — `listArticlesMissingEmbedding` missing abandoned filter
- `app/api/sources/route.ts` — requires admin secret
- `prompts/oxylabs-scraping.md` — curl example missing header
- `supabase/schema.sql` — `pipeline_locks`, existing RPC patterns

## Decisions or assumptions

- Atomic lock acquire via `try_acquire_pipeline_lock` RPC with `LOCK TABLE … EXCLUSIVE`
- Preserve: cron blocks/blocked-by scrape|analyze; manual scrape + analyze may overlap
- Embedding abandoned filter in JS (no foreign-table `.is()`), with over-fetch
- Docs-only curl fix; do not change route auth
- User approved execute via “Implement the plan”

## Files likely to change

- `supabase/schema.sql`
- `lib/supabase/database.types.ts`
- `lib/supabase/queries/pipeline-locks.ts`
- `lib/supabase/queries/articles.ts`
- `prompts/oxylabs-scraping.md`

## Implementation requirements

1. Add `try_acquire_pipeline_lock(p_key text, p_holder text, p_ttl_ms integer) returns boolean`
2. Rewrite `tryAcquirePipelineLock` as thin RPC wrapper; keep `releasePipelineLock`
3. Exclude abandoned articles from embedding backfill
4. Fix `GET /api/sources` curl to include `x-skew-admin-secret: $SKEW_ADMIN_SECRET`
5. Apply RPC in live Supabase before relying on new TS path

## Security requirements

- RPC: `security invoker`, fixed `search_path`, revoke public/anon/authenticated, grant `service_role` only
- No secrets in browser code; docs use `$SKEW_ADMIN_SECRET` env reference only

## Acceptance criteria

- Lock acquire is one DB operation with shared sync point
- Conflict rules unchanged
- Abandoned articles never returned by `listArticlesMissingEmbedding`
- Sources curl documents admin header
- typecheck + lint pass

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps

1. Apply the new RPC SQL in Supabase (Dashboard or MCP) if not already applied.
2. With scrape lock held (or concurrent scrape), cron acquire should fail busy.
3. Manual scrape + manual analyze should still be able to acquire together.
4. Confirm sources curl with header returns 200; without header returns 401.
