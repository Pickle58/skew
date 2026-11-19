# PostHog monitoring for the Vercel Cron pipeline

## Goal

Make each `GET /api/cron/pipeline` run visible in PostHog, so a failed or missed daily run can trigger an alert.

## Skills read

- None beyond `AGENTS.md` sections 18 (Vercel Cron) and 22 (checks); PostHog server helpers already exist.

## Existing code inspected

- `app/api/cron/pipeline/route.ts` — runs `runCronPipeline()`; no PostHog events.
- `app/api/scrape/route.ts`, `app/api/analyze/route.ts` — capture `*_run_completed` / `*_run_failed`, `captureException`, flush, and `emitPostHogLog`.
- `lib/posthog-server.ts`, `lib/posthog-logs.ts`, `lib/posthog-ai.ts` — server client, OTLP logs, AI observability flush.
- `lib/pipeline/cron.ts` — returns `CronPipelineSummary` (`completed` / `partial` / `failed`, including lock busy).

## Decisions / assumptions

- Follow the scrape and analyze route pattern; do not change `lib/pipeline/cron.ts`.
- Use a fixed distinct id `vercel-cron` with `$process_person_profile: false`, so cron runs do not create a person profile.
- Call `flushAiObservability()` in `finally`, because cron also runs AI analysis.
- Missed-run detection is a PostHog insight alert on `cron_pipeline_completed`, not code.

## Files likely to change

- `app/api/cron/pipeline/route.ts`

## Implementation requirements

1. On success, capture `cron_pipeline_completed` with `status`, `scrape_status`, `analyze_status`, `articles_inserted`, `articles_analyzed`, `articles_failed`, `duration_ms`.
2. On a thrown error, capture `cron_pipeline_failed` with `error_message`, call `captureException`, and emit an ERROR log.
3. Flush PostHog before the response returns.

## Security requirements

- Keep the `CRON_SECRET` check first; unauthorized requests send no events.
- Do not send secrets, article content, or user data.

## Acceptance criteria

- One `cron_pipeline_completed` or `cron_pipeline_failed` event per authorized run.
- No PostHog key set: route behaves as before.
- Typecheck and lint pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps

1. Set `ALLOW_INSECURE_CRON=1` and run `npm run dev`.
2. `curl http://localhost:3000/api/cron/pipeline`.
3. In PostHog Activity, confirm a `cron_pipeline_completed` event with `distinct_id` `vercel-cron`.
4. In PostHog, create a trends insight: `cron_pipeline_completed` where `status` is not `failed`, daily total. Add an alert: has value, less than 1, notify Slack.
