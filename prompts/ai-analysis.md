# AI article analysis pipeline

## Goal

Implement AGENTS.md **section 19** — the AI article analysis pipeline:

1. Find valid articles that still need analysis (pending-analysis check).
2. Call OpenAI via the Vercel AI SDK with structured output.
3. Validate the model response with Zod.
4. Insert into `article_analyses`, then set `articles.analyzed_at`.
5. Expose the run as `POST /api/analyze` (admin-secret protected).
6. Log neat console progress and a final summary object; write start/summary/error rows to `logs` with `scope: "analyze"`.

Also add `GET /api/logs` (section 14) so analysis (and scrape) log rows can be inspected without the dashboard. `listLogs` already exists.

**Out of scope (separate later tasks):** pgvector / embeddings / Related Articles (section 20), Oxylabs Scheduler, Vercel Cron / `/api/cron/pipeline`, and UI changes. Home and details pages already read stored analysis; they will show cards once `analyzed_at` is set.

## Skills read

- `.agents/skills/supabase/SKILL.md`:
  - Verify against changelog/docs; service role is server-only; don't loop on failing approaches; RLS remains as-is (no schema changes for this task).
  - Supabase changelog scanned (2026-11): no breaking change affecting supabase-js query patterns used here.
- `.agents/skills/ai-sdk/SKILL.md`:
  - Never write AI SDK code from memory; verify against installed `node_modules` docs after install.
  - Install `ai` first, then `@ai-sdk/openai` when needed.
  - Prefer current model IDs from `https://ai-gateway.vercel.sh/v1/models`, not remembered IDs.
- Context7 `/websites/ai-sdk_dev` (AI SDK 7):
  - Structured output: `generateText` + `Output.object({ schema })` from `ai`; result in `output`.
  - System prompt option is `instructions` (not `system`).
  - OpenAI: `import { openai } from '@ai-sdk/openai'` → `openai('model-id')`; auth via `OPENAI_API_KEY`.
- `.agents/skills/migrate-ai-sdk-v6-to-v7/SKILL.md`: confirm v7 rename `system` → `instructions` and `experimental_output` → `output`.
- `node_modules/next/dist/docs/.../route.md`: Route Handlers use Web `Request`/`Response`; mirror `app/api/scrape/route.ts` (`maxDuration`, Zod body, admin auth).

## Existing code inspected

- `lib/supabase/queries/articles.ts`:
  - `listPendingAnalysisArticles(limit)` — PostgREST anti-join: `article_analyses!left(id)` + `.is("article_analyses", null)`, ordered by `scraped_at` asc. Does **not** look at `analyzed_at`.
  - `markArticleAnalyzed(id)` — sets `analyzed_at` to now.
- `lib/supabase/queries/analyses.ts`: `insertArticleAnalysis(row)` — inserts and returns typed row; `bias_score` is a generated column (omit on insert).
- `lib/supabase/types.ts`: `PendingArticle`, `ArticleAnalysisInsert`, `SentimentLabel`, `BiasLabel`, `LOG_SCOPES` includes `"analyze"`.
- `lib/supabase/queries/logs.ts`: `insertLog` (never throws), `listLogs({ scope?, level?, limit? })`.
- `lib/api/admin-auth.ts` + `ADMIN_SECRET_HEADER` (`x-skew-admin-secret`).
- `lib/env/server.ts`: `getAdminSecret()`; **no** `getOpenAIApiKey` yet.
- `lib/limits.ts`: `DEFAULT_ANALYSIS_BATCH_SIZE = 5`, `MAX_LOG_PAGE_SIZE = 200`.
- `app/api/scrape/route.ts`: pattern for admin auth, empty/invalid JSON body handling, Zod `.strict()`, `maxDuration = 300`, thin route → pipeline function.
- `lib/pipeline/scrape.ts` + `logger.ts` + `types.ts`: console prefix, start/summary `insertLog`, typed summary returned to the route.
- `package.json`: `zod` `4.6.7` present; **`ai` and `@ai-sdk/openai` are not installed**. Latest npm: `ai@7.0.173`, `@ai-sdk/openai@4.0.118`.
- `.env.example`: missing `OPENAI_API_KEY` and `ANALYSIS_BATCH_SIZE`.
- `.env.local` (names only): `OPENAI_API_KEY` and `SKEW_ADMIN_SECRET` are already set.
- Live Supabase `skew_news`: **10 articles, 0 analyses, 10 pending** (`analyzed_at` all null). Enough to test without scraping first.
- `supabase/schema.sql` `article_analyses`: required fields match section 19; percentages must sum to 100; `bias_score` generated as `(right - left) / 100.0`.

## Decisions or assumptions

- **Default run:** process **all** pending articles until none remain. Do not hardcode a total of 10. Batch size defaults to `ANALYSIS_BATCH_SIZE` env or `DEFAULT_ANALYSIS_BATCH_SIZE` (5).
- **Optional request body** (Zod `.strict()`, empty/`{}` allowed):
  ```json
  {
    "articleIds": ["uuid", "..."],
    "limit": 20,
    "batchSize": 5
  }
  ```
  - `articleIds`: optional UUID array (1–50). Only those IDs that are still pending are analyzed; unknown/already-analyzed IDs are counted as skipped.
  - `limit`: optional max articles to analyze this run (1–100). When omitted with no `articleIds`, run until the pending queue is empty.
  - `batchSize`: optional override for this request (1–20); otherwise env/default.
- **Model:** `gpt-5.4-mini` via `@ai-sdk/openai` (`openai("gpt-5.4-mini")`). Chosen as a current, cost-sensible structured-output model for batch news analysis (higher than `gpt-5-mini`, cheaper than flagship gpt-6). Store the exact model id string in `article_analyses.model`. Constant in code (e.g. `ANALYSIS_MODEL`); no new env var beyond AGENTS table.
- **AI SDK API:** `generateText({ model, instructions, prompt, output: Output.object({ schema }) })`. Read `result.output`. After install, re-check `node_modules/ai/docs` and adjust only if the installed version differs.
- **Zod analysis schema** (AI output before DB mapping):
  - `summary`: non-empty string (neutral, 2–4 sentences).
  - `sentimentScore`: number −1..1.
  - `sentimentLabel`: `positive` | `neutral` | `negative`.
  - `politicalFramingLabel`: `left` | `center` | `right` | `mixed` | `unclear`.
  - `leftPercentage`, `centerPercentage`, `rightPercentage`: integers 0–100 that **sum to 100** (Zod refine).
  - `confidence`: number 0..1.
  - `framingNotes`: array of strings (may be empty).
  - `loadedTerms`: array of strings (may be empty).
  - No `disclaimer` from the model — use a fixed product string so UI copy stays consistent:
    `"Political framing is AI-estimated from this article's text and is not objective truth."`
- **Prompt rules (instructions):** analyze from article text only; do not infer framing from outlet name; percentages must sum to 100; use `unclear` + low confidence when evidence is weak; label should match the strongest percentage unless confidence is low or percentages are close (`mixed` / `unclear` as appropriate); sentiment from tone of the article text.
- **Input truncation:** pass title + `raw_text`, truncate `raw_text` to a safe char budget (e.g. 12_000) so long articles don't blow context. Skip articles with empty/whitespace `raw_text` (count as skipped, log warn).
- **Retry:** if structured output fails validation or the call throws a recoverable error, **retry once**. On second failure, count as failed, do not insert, do not set `analyzed_at`, continue the batch.
- **Save order:** `insertArticleAnalysis` → only then `markArticleAnalyzed`. Never set `analyzed_at` without a row. Unique violation on `article_id` (race) → treat as skipped.
- **Pending detection:** reuse / extend `listPendingAnalysisArticles`. Add optional `articleIds` filter in the query module (filter in JS after fetch, or `.in("id", ids)` when provided — still require the anti-join so already-analyzed IDs are not returned). Do **not** use `.eq("article_analyses.id", …)` style foreign-table column filters.
- **Loop:** while pending remain (respecting `limit`), fetch next batch, analyze sequentially within a batch (simpler error isolation; batch size already limits concurrency/timeouts). Continue until no pending left or `limit` reached.
- **Logging:** console prefix `[analyze]`; `insertLog` with `scope: "analyze"` for run start, completion, and unexpected failures. Mirror scrape: logging failures must not abort the run.
- **Summary object** returned by the route:
  ```ts
  {
    status: "completed" | "partial" | "failed",
    articlesConsidered: number,
    analyzed: number,
    skipped: number,
    failed: number,
    batches: number,
    durationMs: number,
    model: string,
    error?: string
  }
  ```
  - `completed`: at least one analyzed and zero failed, or zero pending with nothing to do.
  - `partial`: some analyzed and some failed.
  - `failed`: zero analyzed and (failures or a hard pipeline error).
- **`GET /api/logs`:** query params `scope`, `level`, `limit` (capped by `MAX_LOG_PAGE_SIZE`). Read-only; no admin secret (same posture as `GET /api/sources`). Invalid enum query values → 400.
- **Env:** add `getOpenAIApiKey()` in `lib/env/server.ts` (required at call time). Update `.env.example` with `OPENAI_API_KEY=` and optional `ANALYSIS_BATCH_SIZE=`. Do not print secrets.
- **Route:** `export const maxDuration = 300` on `/api/analyze` (same as scrape). Thin handler; orchestration in `lib/pipeline/analyze.ts`.
- **Packages:** pin via pnpm: `pnpm add ai @ai-sdk/openai` (resolves current 7.x / 4.x). Zod already present — do not add a second Zod major.
- **Security:** OpenAI key and service role stay server-only (`server-only` on AI + pipeline modules). No browser calls to OpenAI. Admin secret required on POST. Never log article full text or API keys.

## Files likely to change

| File | Action |
| --- | --- |
| `package.json` / lockfile | Add `ai`, `@ai-sdk/openai` |
| `.env.example` | Add `OPENAI_API_KEY`, `ANALYSIS_BATCH_SIZE` |
| `lib/env/server.ts` | `getOpenAIApiKey()`, optional batch-size reader |
| `lib/limits.ts` | Keep `DEFAULT_ANALYSIS_BATCH_SIZE`; add analysis text truncate / max IDs constants if needed |
| `lib/ai/analyze-article.ts` | New: Zod schema, instructions, `generateText`+`Output.object`, map to `ArticleAnalysisInsert` |
| `lib/pipeline/analyze.ts` | New: batch loop, logging, summary |
| `lib/pipeline/types.ts` | Add analyze summary / options types (or colocated in analyze pipeline) |
| `lib/supabase/queries/articles.ts` | Extend pending list to accept optional `articleIds` |
| `app/api/analyze/route.ts` | New POST handler |
| `app/api/logs/route.ts` | New GET handler |

No schema.sql / database.types.ts changes for section 19.

## Implementation requirements

1. Install `ai` and `@ai-sdk/openai`; verify structured-output API against installed docs before writing the call site.
2. Implement `analyzeArticleText({ title, rawText })` server module that returns validated fields + model id, or throws after retry exhaustion.
3. Implement `runAnalyzePipeline(options)` that:
   - resolves batch size / limit / optional IDs
   - loops pending batches
   - for each article: analyze → insert → mark analyzed
   - tallies analyzed / skipped / failed
   - logs progress and returns the summary
4. `POST /api/analyze` with admin auth + Zod body → pipeline → JSON summary.
5. `GET /api/logs` with optional filters.
6. Wire env helpers and `.env.example`.
7. Keep layers separate: route thin, AI isolated, DB only via existing query helpers.

## Security requirements

- Reject missing/invalid `x-skew-admin-secret` with `401` on POST analyze.
- Never expose `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `SKEW_ADMIN_SECRET` to client bundles.
- Pipeline and AI modules import `server-only`.
- Do not put secrets in query strings or response bodies.
- Truncate/omit full `raw_text` from log `context` (ids, titles, counts only).

## Acceptance criteria

- `POST /api/analyze` without secret → `401`.
- Empty body analyzes all currently pending articles in batches until none remain (or until timeout budget — with 10 pending and batch 5 this should complete in one or two batches under `maxDuration`).
- `{"limit": 2}` analyzes at most 2; remaining stay pending.
- `{"articleIds":["…"]}` only attempts those pending IDs.
- Each successful analysis inserts one `article_analyses` row with percentages summing to 100, valid labels, fixed disclaimer, and model id; then sets `analyzed_at`.
- Failed validation after retry does not insert and does not set `analyzed_at`.
- Re-running analyze with no pending returns `analyzed: 0`, `skipped`/`considered` reflecting empty work, status `completed`.
- After analyze, `/` shows new cards; `/news/[id]` shows full analysis (existing UI).
- `GET /api/logs?scope=analyze` returns recent analyze log rows.
- `npm run typecheck` and `npm run lint` pass; `npm run build` passes (new routes).

## Checks to run

```
npm run typecheck
npm run lint
npm run build
```

Live verification during implementation (uses OpenAI credits): run analyze against the existing 10 pending articles, then query Supabase for analysis rows and `analyzed_at`.

## Manual test steps (after implementation)

1. Confirm `.env.local` has `OPENAI_API_KEY` and `SKEW_ADMIN_SECRET`. Optionally set `ANALYSIS_BATCH_SIZE=5`. Restart the dev server:
   ```bash
   npm run dev
   ```
2. Watch the Next.js terminal for `[analyze]` lines.
3. Reject missing secret (expect `401`):
   ```bash
   curl -i -X POST http://localhost:3000/api/analyze
   ```
4. Analyze a small batch first:
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "Content-Type: application/json" \
     -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET" \
     -d '{"limit":2,"batchSize":2}'
   ```
5. Analyze the rest (all remaining pending):
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET"
   ```
6. Re-run step 5; expect `analyzed: 0` (nothing pending).
7. Inspect logs:
   ```bash
   curl "http://localhost:3000/api/logs?scope=analyze&limit=20"
   ```
8. In Supabase SQL Editor:
   ```sql
   select a.title, aa.sentiment_label, aa.bias_label,
          aa.left_percentage, aa.center_percentage, aa.right_percentage,
          aa.confidence, aa.model, a.analyzed_at
   from articles a
   join article_analyses aa on aa.article_id = a.id
   order by a.analyzed_at desc
   limit 20;

   select count(*) as pending
   from articles a
   left join article_analyses aa on aa.article_id = a.id
   where aa.id is null;
   ```
9. Open `http://localhost:3000/` — cards should appear for analyzed articles. Open a card — details should show summary, sentiment, framing percentages, confidence, framing notes, loaded terms, and disclaimer.
