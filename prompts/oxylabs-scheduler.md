# Automatic hourly pipeline via Vercel Cron (Oxylabs Scheduler re-plan)

## Goal

Automate the hourly scrape → analyze pipeline without Oxylabs Scheduler.

This account uses the Oxylabs **Web API** (`webapi.oxylabs.io`, Bearer `OXYLABS_WEB_API_KEY`). Oxylabs Scheduler is a **Web Scraper API** feature (`data.oxylabs.io`, Basic auth) and is not available here. Live docs confirm Scheduler lives only under Web Scraper API.

**Re-planned design (replaces AGENTS.md section 18 Oxylabs-Scheduler-specific parts):**

1. Vercel Cron fires hourly and `GET`s `/api/cron/pipeline`.
2. The cron route runs `runScrapePipeline` with the existing `liveHomepageProvider` (live Web API homepage fetches).
3. Immediately after scrape, the same request runs `runAnalyzePipeline` on all pending articles.
4. If scrape fails, analysis still runs (pre-existing unanalyzed articles).

Out of scope:

- Creating or syncing Oxylabs schedules (`POST/GET /api/oxylabs/schedules`)
- Processing Oxylabs scheduled job HTML (`POST /api/oxylabs/scheduled-results/process`)
- Writing to `oxylabs_schedules` / `oxylabs_schedule_runs` (tables stay in schema unused)
- UI changes, pgvector changes, manual scrape/analyze behavior changes beyond trigger typing

## Skills read

- `.agents/skills/web-scraper-api/SKILL.md` (project path for the referenced oxylabs-web-scraper skill): Realtime/Push-Pull Web Scraper API with Basic auth. Does **not** describe the Web API product this project uses.
- Live Oxylabs Scheduler docs (`https://developers.oxylabs.io/products/web-scraper-api/features/scheduler`): `data.oxylabs.io/v1/schedules`, Basic auth, `/runs` with `result_status`. Confirms Scheduler is Web Scraper API only.
- Prior decision in `prompts/oxylabs-web-api.md`: Scheduler must be re-planned; preferred option is Vercel Cron + live scrape + analyze.
- `.agents/skills/supabase/SKILL.md`: service-role writes only; do not invent client exposure; no schema change required for this task (existing `logs.scope` already includes `cron`).
- Vercel Cron docs (fetched 2026-11-17):
  - `vercel.json` `crons: [{ path, schedule }]` invokes the path with HTTP GET.
  - Secure with project env `CRON_SECRET`; Vercel sends `Authorization: Bearer <CRON_SECRET>`.
  - Hobby legacy Cron Jobs: once per day max. Hourly (`0 * * * *`) requires Pro (or the newer Schedules beta, which allows ≥15m on Hobby). This prompt uses legacy `crons` as AGENTS.md specifies; document the Pro requirement in test steps.

## Existing code inspected

- `lib/pipeline/scrape.ts`: `runScrapePipeline` + `liveHomepageProvider` already support a pluggable homepage provider; default is live Oxylabs Web API fetch. Trigger type is `"manual" | "scheduler"`.
- `lib/pipeline/analyze.ts`: `runAnalyzePipeline` processes all pending analyses (LEFT JOIN style pending detection) + embedding backfill.
- `app/api/scrape/route.ts` / `app/api/analyze/route.ts`: thin POST handlers, `maxDuration = 300`, admin secret via `x-skew-admin-secret`.
- `lib/api/admin-auth.ts`: timing-safe SHA-256 compare for admin secret.
- `lib/env/server.ts`: no cron helpers yet.
- `lib/supabase/queries/oxylabs.ts`: schedule list/upsert/run helpers exist but are unused by any route.
- `supabase/schema.sql`: `oxylabs_schedules`, `oxylabs_schedule_runs`, and `logs.scope` including `cron` already exist.
- No `vercel.json` yet. No `/api/cron/*` route yet.

## Decisions or assumptions

1. **No Oxylabs Scheduler integration.** Do not implement sync/list/process Oxylabs schedule routes. Do not call `data.oxylabs.io`. Do not require Basic-auth Oxylabs credentials.
2. **Cron = live scrape + analyze.** `GET /api/cron/pipeline` orchestrates both steps in one invocation.
3. **Homepage HTML** comes from `liveHomepageProvider` (same path as manual scrape). No scheduled-job HTML provider.
4. **Schedule expression:** `0 * * * *` (top of every hour UTC). No `:15` offset — that offset only existed to wait for Oxylabs Scheduler jobs.
5. **Config shape:** root `vercel.json` with legacy `crons` array (matches AGENTS.md). Path `/api/cron/pipeline`.
6. **Auth:**
   - Production / Vercel: require `Authorization: Bearer ${CRON_SECRET}` with timing-safe compare (same style as admin auth).
   - Local development (`NODE_ENV === "development"`): skip the secret check so `curl` works without putting `CRON_SECRET` in `.env.local`.
   - Do **not** use `SKEW_ADMIN_SECRET` on the cron route.
   - Do **not** add `CRON_SECRET` to `.env.example` as a required local var; keep the AGENTS.md note that Vercel injects/stores it in project settings. Optionally add a commented line in `.env.example` documenting that it is Vercel-only.
7. **Trigger typing:** extend `ScrapeTrigger` to `"manual" | "scheduler" | "cron"`. Cron route passes `trigger: "cron"`. Keep `"scheduler"` in the union for forward compatibility; unused for now.
8. **Defaults on cron scrape:** all active sources, default `perSource` (`DEFAULT_ARTICLES_PER_SOURCE`). No request body.
9. **Analysis on cron:** full pending run (no artificial limit). Use default batch size from env.
10. **Logging:**
    - Console: `[cron]` prefix for orchestration; scrape/analyze keep their own prefixes.
    - `insertLog` with `scope: "cron"` for start, scrape outcome, analyze outcome, and final summary.
    - If scrape throws/fails, log it and still run analyze.
11. **Response:** JSON summary `{ scrape, analyze, durationMs, status }` where `status` is `completed` | `partial` | `failed` derived from both steps (failed if both failed or hard crash; partial if either partial/failed; completed if both completed).
12. **`maxDuration = 300`** on the cron route (same as scrape/analyze).
13. **AGENTS.md section 18 rewrite:** replace Oxylabs-Scheduler-specific instructions with this re-plan so future agents do not re-implement unavailable APIs. Keep env table `CRON_SECRET` row. Remove or mark obsolete the “deliver sync + process routes” checklist; replace with “deliver vercel.json + cron pipeline route”.
14. **Unused tables/queries:** leave `oxylabs_schedules` / `oxylabs_schedule_runs` and `lib/supabase/queries/oxylabs.ts` in place. Do not delete schema. Do not wire routes to them in this task.
15. **Hobby plan note:** hourly legacy crons fail deploy on Hobby. Implementation still uses hourly; test steps tell the user to confirm Pro (or temporarily use a daily expression / Schedules beta if they stay on Hobby).

## Files likely to change

| File | Change |
| ---- | ------ |
| `vercel.json` | New: cron entry for `/api/cron/pipeline` hourly |
| `app/api/cron/pipeline/route.ts` | New: GET handler, cron auth, scrape then analyze |
| `lib/api/cron-auth.ts` | New: `isAuthorizedCronRequest` (dev skip + timing-safe Bearer check) |
| `lib/pipeline/cron.ts` | New: `runCronPipeline()` orchestration + typed summary |
| `lib/pipeline/types.ts` | Add `"cron"` to `ScrapeTrigger`; add `CronPipelineSummary` |
| `lib/env/server.ts` | Optional `getCronSecret()` helper returning `string \| null` |
| `.env.example` | Commented note that `CRON_SECRET` is set in Vercel project settings only |
| `AGENTS.md` | Rewrite section 18 to the Web-API-compatible re-plan |

## Implementation requirements

### 1. Cron auth (`lib/api/cron-auth.ts`)

- `server-only`.
- If `process.env.NODE_ENV === "development"`, return `true`.
- Otherwise require `process.env.CRON_SECRET` and `Authorization: Bearer <secret>`.
- Compare with the same SHA-256 + `timingSafeEqual` pattern as `lib/api/admin-auth.ts`.
- Missing/wrong secret → caller returns `401`.

### 2. Orchestration (`lib/pipeline/cron.ts`)

```ts
export async function runCronPipeline(): Promise<CronPipelineSummary>
```

Steps:

1. Log start (`scope: "cron"`).
2. Run `runScrapePipeline({ trigger: "cron" })` inside try/catch. Capture summary or failure object; never throw out of this step.
3. Always run `runAnalyzePipeline({})` inside try/catch (even if scrape failed).
4. Build combined summary + final `insertLog`.
5. Return the summary to the route.

Do not duplicate scrape/analyze validation, Oxylabs calls, or pending-article selection.

### 3. Route (`app/api/cron/pipeline/route.ts`)

- Export `maxDuration = 300`.
- `GET` only.
- Unauthorized → `{ error: "Unauthorized" }` with status `401`.
- On success → `200` + `CronPipelineSummary` JSON.
- Unexpected throw outside orchestration → `500` + `{ error: "Cron pipeline failed" }` and console error (no secrets).

### 4. `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/pipeline",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 5. AGENTS.md section 18

Rewrite to document:

- Why Oxylabs Scheduler is not used (Web API account).
- Automatic flow: Vercel Cron hourly → live scrape → analyze.
- Auth with `CRON_SECRET` / Bearer; skip in local development; never in `.env.local`.
- Deliverables: `vercel.json` + `/api/cron/pipeline` only (no Oxylabs schedule sync/process routes).
- Manual fallbacks remain `POST /api/scrape` and `POST /api/analyze` with admin secret.

## Security requirements

- Never expose `CRON_SECRET`, `OXYLABS_WEB_API_KEY`, `OPENAI_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Cron route must not accept `SKEW_ADMIN_SECRET` as a substitute, and admin routes must not accept `CRON_SECRET` as a substitute.
- Cron route is server-only work: no client components call scrape/analyze.
- Timing-safe secret compare.
- Do not log Authorization headers or secrets.

## Acceptance criteria

- [ ] `GET /api/cron/pipeline` exists, protected in non-development by `Authorization: Bearer $CRON_SECRET`.
- [ ] In development, the same GET works without a secret.
- [ ] Cron run executes live scrape for all active sources (default per-source limit), then analysis for pending articles.
- [ ] Scrape failure does not skip analysis.
- [ ] Console + `logs` table entries use scope `cron` for orchestration.
- [ ] `vercel.json` registers the hourly cron path.
- [ ] No Oxylabs Scheduler HTTP client or schedule sync/process routes added.
- [ ] AGENTS.md section 18 matches the re-plan.
- [ ] `npm run typecheck` and `npm run lint` pass; `npm run build` passes (route + vercel.json).

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

## Exact manual test steps expected after implementation

1. Ensure `npm run dev` is running and watch that terminal for `[cron]`, `[scrape]`, and `[analyze]` logs.
2. Local (no secret):

```bash
curl -sS -X GET http://localhost:3000/api/cron/pipeline
```

Expect `200` JSON with `scrape` and `analyze` summaries.

3. Unauthorized check (temporarily set `NODE_ENV=production` is unnecessary in normal local flow). Instead, after deploy, call without header and expect `401`. Optionally unit-smoke by exporting a production-like env in a one-off node script is not required.

4. Confirm articles gained `analyzed_at` and appear on the home page after a successful cron run (same as after manual scrape + analyze).

5. Production setup (user action):

- In Vercel project settings, set `CRON_SECRET` to a random ≥16 character alphanumeric string (no spaces/newlines).
- Deploy so `vercel.json` registers the cron.
- Confirm the job appears under Project → Schedules / Cron Jobs.
- Confirm the plan allows hourly crons (Pro). On Hobby, either upgrade or change the schedule to a once-daily expression before deploy.
- After the first scheduled hour, inspect Vercel function logs and Supabase `logs` rows with `scope = 'cron'`.

6. Manual fallbacks still work:

```bash
curl -sS -X POST http://localhost:3000/api/scrape \
  -H "content-type: application/json" \
  -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET" \
  -d "{}"

curl -sS -X POST http://localhost:3000/api/analyze \
  -H "content-type: application/json" \
  -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET" \
  -d "{}"
```
