# Production hardening (Hobby daily cron)

## Goal

Harden Skew against the production-readiness gaps from the code review while keeping the Hobby **once-daily** cron (`0 19 * * *` in `vercel.json`). Do not add a second cron or switch to hourly.

Cover:

1. Admin-protect `GET /api/logs` and `GET /api/sources`
2. Safer cron auth (`ALLOW_INSECURE_CRON` only in development)
3. Admin secret minimum length (≥16)
4. Schema: analysis dead-letter columns, `pipeline_locks`, orphan repair, IVFFlat lists tuning
5. Analyze reliability: orphan repair, sequential analyze→save→embed→mark, attempt/abandon caps
6. Cron overlap lock + 270s analyze time budget
7. Redact PostHog `$ai_input` (no full article body)
8. Split article metadata/detail queries; Zod sentiment/framing refine; gate `/design-system` in production
9. Document daily Hobby cron in AGENTS §18 / env table
10. Vitest unit tests for auth + framing refine + reject-list helpers

## Skills read

- `.agents/skills/supabase/SKILL.md` — schema/RLS/service role; revoke anon/authenticated on new tables; update `schema.sql` + types; Dashboard ALTER before testing
- `.agents/skills/ai-sdk/SKILL.md` — keep existing generateText/embed patterns; only change validation + telemetry payload
- `node_modules/next/dist/docs/` as needed for route handlers / `notFound`

## Existing code inspected

- `app/api/logs/route.ts`, `app/api/sources/route.ts` — no auth today
- `lib/api/admin-auth.ts`, `lib/api/cron-auth.ts` — timing-safe digests; cron allows all requests in development
- `lib/pipeline/analyze.ts` — `Promise.all(analyze, embed)`; `markSaved` can fail after insert; no abandon/orphan repair
- `lib/pipeline/cron.ts` — scrape then analyze; no lock/deadline
- `lib/supabase/queries/articles.ts` — pending LEFT JOIN; `getArticleDetail` selects embedding; home requires `analyzed_at`
- `lib/posthog-ai.ts` + AI callers — full prompt/body as `$ai_input`
- `vercel.json` — `0 19 * * *` (keep)
- `supabase/schema.sql` — IVFFlat `lists = 1`; no dead-letter/lock tables
- `package.json` — no test runner yet

## Decisions or assumptions

- Daily cron stays; mitigate timeout with `CRON_TIME_BUDGET_MS = 270_000` passed into analyze
- Dead-letter on `articles`: `analysis_attempt_count`, `analysis_last_error`, `analysis_abandoned_at`; max attempts = 3
- Orphan repair requires analysis row **and** non-null embedding before setting `analyzed_at`
- Sequential analyze → insert (embedding null) → embed → update embedding → mark `analyzed_at`
- Pipeline locks table with keys `cron` | `scrape` | `analyze`; TTL 5 minutes; stale reclaimable
- Cron acquires `cron` and refuses if scrape/analyze held; manual scrape/analyze acquire their keys
- Cron auth: allow without secret only when `ALLOW_INSECURE_CRON=1` **and** `NODE_ENV === "development"`
- Prefer repair helper + improved mark over a giant `save_article_analysis` RPC this pass (repair every run)
- Vitest for pure unit tests only (no live network)
- User must run Dashboard ALTER SQL before testing DB-backed features

## Files likely to change

- `prompts/production-hardening.md` (this file)
- `app/api/logs/route.ts`, `app/api/sources/route.ts`
- `app/api/scrape/route.ts`, `app/api/analyze/route.ts` (lock acquire/release)
- `app/api/cron/pipeline/route.ts` (unchanged auth import path; cron pipeline owns lock)
- `lib/api/cron-auth.ts`, `lib/env/server.ts`
- `lib/limits.ts`, `lib/pipeline/types.ts`, `lib/pipeline/analyze.ts`, `lib/pipeline/cron.ts`, `lib/pipeline/scrape.ts`
- `lib/supabase/schema` via `supabase/schema.sql`, `lib/supabase/database.types.ts`, `lib/supabase/types.ts`
- `lib/supabase/queries/articles.ts`, `lib/supabase/queries/analyses.ts`, new `lib/supabase/queries/pipeline-locks.ts`
- `lib/ai/analyze-article.ts`, `lib/ai/embed-article.ts`, `lib/posthog-ai.ts` (optional helper)
- `app/news/[id]/page.tsx`, `app/design-system/page.tsx`
- `.env.example`, `AGENTS.md` (§18 note + §21 env table)
- `package.json`, `vitest.config.ts`, `lib/**/*.test.ts`

## Implementation requirements

### Auth / secrets

1. Require `isAuthorizedAdminRequest` on logs + sources routes.
2. Cron: insecure only with `ALLOW_INSECURE_CRON=1` + development.
3. `getAdminSecret()`: if set and length < 16, treat as unset (warn + reject).
4. Document `ALLOW_INSECURE_CRON` in `.env.example` and AGENTS §21. Do not add `CRON_SECRET` to `.env.local`.

### Schema (also pasteable ALTER for Dashboard)

1. Articles columns for attempts/error/abandoned.
2. `pipeline_locks(key text PK, holder text, expires_at timestamptz)` + RLS enable + revoke anon/authenticated.
3. `repair_analyzed_at_orphans()` RPC → service_role only; sets `analyzed_at` where analysis+embedding exist and `analyzed_at` is null; returns count.
4. IVFFlat lists = `greatest(1, least(100, ceil(sqrt(row_count))))` when (re)creating index.

### Analyze / scrape / cron

1. Analyze: repair orphans first; exclude abandoned from pending; sequential save path; record attempts; abandon at max; unique-violation → repair/mark if needed.
2. AnalyzeOptions: optional `deadlineMs`.
3. Cron: acquire `cron` lock (fail busy); scrape; analyze with deadline; release in `finally`.
4. Manual scrape/analyze: acquire/release their locks (409 or summary error if busy).

### Telemetry / UI / queries

1. PostHog `$ai_input` = `{ kind, title, charCount }` only.
2. `getArticleMetadata` for `generateMetadata`; detail without shipping embedding to page props; embedding only for related.
3. Zod superRefine for sentiment bands + framing label rules.
4. Design-system `notFound()` in production.
5. AGENTS §18: document Hobby daily cron.

### Tests

- Vitest: admin/cron auth behavior (with env), framing/sentiment refine helpers, reject-list or URL reject helpers if pure/exportable.
- Script: `"test": "vitest run"`.

## Security requirements

- Never expose service role / OpenAI / Oxylabs / admin / cron secrets to the browser.
- New tables: RLS on, no policies, revoke anon/authenticated.
- RPCs: revoke from public/anon/authenticated; grant execute to service_role only.
- Do not log full article bodies to PostHog.

## Acceptance criteria

- Logs/sources without secret → 401; with valid secret → 200
- Cron without secret in production-like mode → 401; with `ALLOW_INSECURE_CRON=1` in development → allowed
- Overlapping cron/scrape/analyze blocked by lock
- Abandoned articles stop retrying after 3 failures
- Orphans with analysis+embedding get `analyzed_at` repaired
- `$ai_input` never contains full body
- `/design-system` 404 in production build behavior
- `vercel.json` schedule unchanged (`0 19 * * *`)
- `typecheck`, `lint`, `test`, `build` pass

## Checks to run

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Manual test steps

1. Run Dashboard ALTER SQL from this prompt’s schema section (or full schema apply of new statements).
2. Set `ALLOW_INSECURE_CRON=1` in `.env.local` for local cron tests only.
3. `npm run dev`
4. Curl logs/sources without header → 401; with `x-skew-admin-secret` → 200.
5. `GET /api/cron/pipeline` with insecure flag in dev → runs; without flag and without Bearer → 401.
6. Watch terminal for `[cron]` / `[analyze]` logs; confirm lock busy message if two overlapping runs.
7. Confirm `vercel.json` still daily.

## Dashboard ALTER SQL (run before testing)

```sql
alter table public.articles
  add column if not exists analysis_attempt_count integer not null default 0,
  add column if not exists analysis_last_error text,
  add column if not exists analysis_abandoned_at timestamptz;

create table if not exists public.pipeline_locks (
  key text primary key check (key in ('cron', 'scrape', 'analyze')),
  holder text not null,
  expires_at timestamptz not null
);

alter table public.pipeline_locks enable row level security;
revoke all on table public.pipeline_locks from anon, authenticated;

create or replace function public.repair_analyzed_at_orphans()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  repaired integer;
begin
  with updated as (
    update public.articles as a
    set analyzed_at = now()
    from public.article_analyses as aa
    where aa.article_id = a.id
      and a.analyzed_at is null
      and aa.embedding is not null
    returning a.id
  )
  select count(*)::integer into repaired from updated;
  return repaired;
end;
$$;

revoke all on function public.repair_analyzed_at_orphans() from public, anon, authenticated;
grant execute on function public.repair_analyzed_at_orphans() to service_role;
```

(IVFFlat rebuild is optional ops follow-up; update `schema.sql` creation logic for future applies.)
