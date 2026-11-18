# Switch scraping to the Oxylabs Web API, then tune each source live

## Goal

1. Replace the Oxylabs Web Scraper API client (`realtime.oxylabs.io`, Basic auth) with the Oxylabs **Web API** (`webapi.oxylabs.io/v1/scrape`, Bearer API key).
   - The user's Oxylabs account has a Web API instance (`webapi_1`) and no Web Scraper API user.
   - Every request so far has failed with `401` because of this product mismatch.
2. Run the live tuning pass from the end of `prompts/oxylabs-scraping.md`, one source at a time, starting with Reuters.

Nothing else in the pipeline changes. Parsing, validation, dedupe, inserts, logging, and routes stay as built in `prompts/oxylabs-scraping.md`.

Out of scope: the Scheduler task (see Decisions), AI analysis, cron, and UI.

## Skills read

- `.agents/skills/web-scraper-api/SKILL.md`: describes the older Web Scraper API (Basic auth, `source: "universal"`, `render`). It doesn't match the user's product, so the live Web API docs take precedence for this change.
- Live Oxylabs docs (fetched 2026-11-16):
  - `https://developers.oxylabs.io/products/web-api/authentication`:
    - `Authorization: Bearer <API key>` on every request. Basic auth is rejected with `401`, with no body.
    - The key is a spending credential, so keep it in an environment variable.
  - `https://developers.oxylabs.io/products/web-api/scrape`:
    - `POST https://webapi.oxylabs.io/v1/scrape` with body `{ url, output: ["html"], run_js?: boolean, location?, device? }`. Unrecognized fields are rejected with `400`.
    - Response: `{ status, results: [{ html, markdown, json, screenshot, metadata: { url, page, run_js } }], params, metadata: { timestamp, request_id } }`. Unrequested formats are `null`.
    - Recommended client timeout: 150 s.
  - `https://developers.oxylabs.io/products/web-api/troubleshooting`:
    - Retry `408`, `429`, and `5xx` with backoff.
    - Don't retry `400`, `401`, `404`, or `405`.
    - A `429` that persists for more than 30 s means the quota is exhausted.
  - Search results confirm the Scheduler (`data.oxylabs.io/v1/schedules`) is a Web Scraper API feature only. The Web API has no scheduler endpoint.

## Existing code inspected

- `lib/scraping/oxylabs.ts`:
  - Basic-auth Realtime client, with a Zod response schema `{ results: [{ content, status_code, url? }] }`.
  - Retries once for 429, 5xx, and timeout.
  - `target_status` covers non-2xx target pages.
- `lib/env/server.ts`: `getOxylabsCredentials()` reads `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD`.
- `lib/parsing/strategies.ts`: `ParserStrategy.render: boolean`, passed as `{ render }` by `lib/pipeline/scrape.ts`.
- `lib/limits.ts`: `OXYLABS_TIMEOUT_MS = 90_000`, `OXYLABS_RENDER_TIMEOUT_MS = 180_000`.
- `.env.example` and the `AGENTS.md` section 21 env table both list `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD`.

## Decisions or assumptions

- **New env var:** `OXYLABS_WEB_API_KEY`, the name the Oxylabs docs use. Server-only. It replaces `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD` in code, `.env.example`, and the `AGENTS.md` env table. The old lines in `.env.local` become unused, and the user can delete them.
- **Request body:** `{ url, output: ["html"] }`, plus `run_js: true` only when the strategy's `render` flag is set.
  - `run_js` is omitted otherwise, so Oxylabs picks its default path, as the docs advise.
  - We keep requesting HTML rather than Markdown, because the parser needs JSON-LD, meta tags, and selectors.
- **No target status code** exists in Web API responses. A page that comes back as an error page is caught by article validation (missing title, image, or date), so `target_status` is removed from `OxylabsErrorKind`.
- **Empty HTML:** a `null` or empty `results[0].html` returns `invalid_response`.
- **Retries:** one retry after 2 s for `408`, `429`, `5xx`, and client timeouts, as before. The single retry keeps a run within `maxDuration = 300`. Every other status fails immediately.
- **Timeouts:** `OXYLABS_TIMEOUT_MS = 90_000` stays for normal requests. `OXYLABS_RENDER_TIMEOUT_MS` becomes `150_000`, which the docs recommend for `run_js`.
- **Logging:** errors include `metadata.request_id` when the response has one, so failures can be reported to Oxylabs support. Never log the key or the `Authorization` header.
- **Strategy field name:** `ParserStrategy.render` keeps its name, which avoids unrelated churn. The client maps it to `run_js`.
- **Scheduler impact, recorded but not acted on:**
  - `AGENTS.md` section 18 assumes the Web Scraper API Scheduler, which this account can't use.
  - Section 18 gets a short note that the Scheduler task must be re-planned against the Web API.
  - One likely option is Vercel Cron calling the same scrape pipeline, with `liveHomepageProvider`, then analysis.
  - The Scheduler task decides. Nothing else in section 18 changes now.
- **Tuning budget:** the account shows the Free tier with $5 of credit.
  - Each source gets 1 homepage scrape plus at most 4 detail scrapes (`perSource: 2`).
  - Expect about 25 requests in total, plus a few more if a source needs `run_js` or a selector retest.
  - If Oxylabs returns a quota `429`, stop and report instead of retrying.

## Files likely to change

- `lib/env/server.ts`: `getOxylabsApiKey()` replaces `getOxylabsCredentials()`.
- `lib/scraping/oxylabs.ts`: endpoint, Bearer auth, request body, Zod response schema, error kinds, retryable statuses, and `request_id` in error messages.
- `lib/limits.ts`: `OXYLABS_RENDER_TIMEOUT_MS = 150_000`.
- `.env.example`: `OXYLABS_WEB_API_KEY=` replaces the two `OXY_WSA_*` lines.
- `AGENTS.md`:
  - Section 21 env table: one row, `OXYLABS_WEB_API_KEY` | Oxylabs Web API key (Bearer) for scraping | server only.
  - Section 18: the one-line re-plan note.
- During tuning, only when live results require it:
  - `lib/parsing/strategies.ts`: selectors, article path rules, and `render` per source.
  - `lib/parsing/clean.ts`: noise rules.

## Implementation requirements

### 1. Env

```ts
export function getOxylabsApiKey(): string {
  return required("OXYLABS_WEB_API_KEY");
}
```

The error names the variable but never prints the value.

### 2. Client (`lib/scraping/oxylabs.ts`)

- `POST https://webapi.oxylabs.io/v1/scrape`
  - Headers: `Authorization: Bearer ${key}` and `Content-Type: application/json`.
  - Body: `{ url, output: ["html"], ...(render ? { run_js: true } : {}) }`.
  - Also set `signal: AbortSignal.timeout(...)` and `cache: "no-store"`.
- Zod schema:

  ```ts
  z.object({
    results: z.array(z.object({
      html: z.string().nullable(),
      metadata: z.object({ url: z.string().optional() }).partial().optional(),
    })).min(1),
    metadata: z.object({ request_id: z.string().optional() }).partial().optional(),
  })
  ```

- Status mapping:
  - `401` → `auth` (no body)
  - `429` → `rate_limited`
  - `408` → `timeout`
  - `400` / `404` / `405` → `http`, not retried
  - `5xx` → `http`, retried
- Keep `OxylabsHtmlResult` the same shape, minus `statusCode`, so `lib/pipeline/scrape.ts` changes as little as possible. `finalUrl` comes from `results[0].metadata.url`, falling back to the requested URL.
- Keep the exhaustive `never` switch in `isRetryable`.

### 3. Docs and env files

Update `.env.example` and the `AGENTS.md` rows/note as described in Decisions. Don't touch `.env.local`; the user adds the key.

### 4. Live tuning pass

Run this after the user confirms `OXYLABS_WEB_API_KEY` is in `.env.local`.

1. Verify the key with one homepage scrape, printing the status code only.
2. Process sources in this order: **Reuters, NPR, BBC News, Fox News, The Guardian.** For each source:
   1. Fetch the homepage once through the new client into a git-ignored temp folder. Run `extractCandidateLinks`. Check the kept candidates (real story URLs only) and the rejection reasons.
   2. If extraction finds 0 candidates, retry once with `run_js: true`. If that fixes it, set `render: true` for that strategy.
   3. Fix any wrong accepts or rejects in the article path rules or card selectors.
   4. Run `POST /api/scrape` with `{"sources":["<name>"],"perSource":2}`.
   5. Query the inserted rows and check:
      - title, `original_url` / `canonical_url`, `published_at`, and `image_url`
      - the first and last paragraphs of `raw_text`, which must contain no promos, captions, share text, or code
   6. Fix any noise and re-run the parser offline on the saved HTML. Don't re-scrape.
3. Delete the temp folder afterward.

Tuning must not insert bad rows. If a row from a test run turns out to be invalid, report it and propose a targeted `delete … where id = …` for the user's approval. Never run a bulk delete.

## Security requirements

- `OXYLABS_WEB_API_KEY` is read only in `lib/env/server.ts` (`server-only`). It is never logged, never returned in responses, and never prefixed with `NEXT_PUBLIC_`.
- The key from the user's screenshot should be treated as exposed. The user refreshes it in the dashboard before adding it to `.env.local`, and the new value never appears in chat or tool output.
- All other security rules from `prompts/oxylabs-scraping.md` still apply: the admin secret, no URLs from request bodies, and append-only inserts.

## Acceptance criteria

- No code references `realtime.oxylabs.io`, `OXY_WSA_USERNAME`, or `OXY_WSA_PASSWORD`.
- With a valid key, `POST /api/scrape` with `{"sources":["NPR"],"perSource":2}` inserts valid NPR articles.
- With a missing or invalid key, it reports `Missing environment variable: OXYLABS_WEB_API_KEY` or `Oxylabs rejected credentials (401)` per source, without crashing.
- After tuning, each of the five sources inserts at least 1 valid article in a `perSource: 2` run. Any source that can't is reported with the reason, such as a block or a missing date.
- Spot-checked rows have article-specific URLs, real titles, `https` images, correct dates, and clean multi-paragraph text.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Checks to run

```
npm run typecheck
npm run lint
npm run build
```

Plus the live tuning pass above.

## Manual test steps (after implementation)

1. In the Oxylabs dashboard, open `webapi_1`, then **Configurator → Authentication**, and click **Refresh API key**. The old key appeared in a screenshot.
2. Add the new key to `.env.local`, without quotes. The `OXY_WSA_*` lines can be deleted.
   ```
   OXYLABS_WEB_API_KEY=<new key>
   ```
3. Restart `npm run dev` and watch its terminal for `[scrape]` lines.
4. Run a small scrape:
   ```bash
   curl -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" \
     -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET" \
     -d '{"sources":["Reuters"],"perSource":2}'
   ```
5. Inspect the inserted rows in the Supabase SQL Editor:
   ```sql
   select s.name, a.title, a.original_url, a.published_at, left(a.raw_text, 200)
   from articles a join sources s on s.id = a.source_id
   order by a.scraped_at desc limit 20;
   ```
