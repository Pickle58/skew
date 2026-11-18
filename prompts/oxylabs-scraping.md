# Oxylabs manual scraping pipeline

## Goal

Implement the **scrape-to-insert pipeline** from AGENTS.md section 9 and expose it as the manual `POST /api/scrape` route (section 16):

1. Load the selected active sources from Supabase.
2. Fetch each source homepage live through the Oxylabs Web Scraper API (Realtime).
3. Extract story-card links, reject non-article URLs, normalize, dedupe, and skip URLs already stored.
4. Scrape candidate article detail pages through Oxylabs.
5. Validate and clean each page (section 13), then insert the valid ones append-only.
6. Log progress to the console, write start/summary/error rows to `logs`, and return the summary object.

The pipeline core must take a pluggable "homepage HTML provider" so the later Scheduler task (section 18) can feed it completed Oxylabs job HTML without duplicating any logic.

Also add `GET /api/sources` (section 14), a read-only route that lists active source names, so source selection (section 8) is possible without the dashboard.

Out of scope (separate later tasks): Oxylabs Scheduler and its routes, `vercel.json` cron, `/api/cron/pipeline`, AI analysis, `/api/analyze`, `GET /api/logs`, pgvector, and UI changes.

## Skills read

- `.agents/skills/web-scraper-api/SKILL.md` (the repo's Oxylabs skill; `.agents/skills/oxylabs-web-scraper` does not exist):
  - Realtime endpoint: `POST https://realtime.oxylabs.io/v1/queries`, HTTP Basic Auth with `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD`.
  - Use `source: "universal"` with `url` for arbitrary sites.
  - `render: "html"` only for JavaScript-heavy pages. Rendered requests need client timeouts near 180 s.
  - Response: `{ results: [{ content, status_code, url }] }`.
  - Errors: 400 invalid params, 401 auth, 403 denied, 429 rate limit.
- `.agents/skills/supabase/SKILL.md`:
  - The service role key is server-only.
  - Verify changes with a real query.
  - Don't loop on failing approaches.
  - No schema changes are needed for this task, so there's no migration work.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`: Route Handlers use Web `Request`/`Response`, and `POST` handlers are always dynamic.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md`: `export const maxDuration = <seconds>` on `route.ts`.

## Existing code inspected

- `lib/supabase/queries/sources.ts`: `listActiveSources({ ids?, names? })` already filters active sources, with names matched case-insensitively in JS.
- `lib/supabase/queries/articles.ts`:
  - `findExistingArticleUrls(urls)` checks both `original_url` and `canonical_url` in chunks of `URL_EXISTENCE_CHUNK_SIZE = 15` per `.in()`.
  - `insertArticles(rows)` is append-only (`ON CONFLICT DO NOTHING`), with a row-by-row fallback for `canonical_url` collisions.
- `lib/supabase/queries/logs.ts`: `insertLog({ level, scope: 'scrape', message, context })` never throws.
- `lib/supabase/types.ts`: `SourceRow`, `ArticleInsert`, `ArticleRow`, `Json`.
- `lib/limits.ts`: `URL_EXISTENCE_CHUNK_SIZE`, `DEFAULT_ARTICLES_PER_SOURCE = 5`.
- `supabase/schema.sql`:
  - `articles` requires `title`, `image_url`, `published_at`, and `raw_text`.
  - `original_url` is unique, and `canonical_url` is unique and nullable.
  - `sources.parser_strategy` is free `text`, defaulting to `'generic'`.
- Live `sources` table (Supabase MCP): five active rows, all `parser_strategy = 'generic'`, with 0 articles:

  | name | listing_url |
  | --- | --- |
  | BBC News | `https://www.bbc.com/news` |
  | Fox News | `https://www.foxnews.com/` |
  | NPR | `https://www.npr.org/` |
  | Reuters | `https://www.reuters.com/` |
  | The Guardian | `https://www.theguardian.com/us` |

- `proxy.ts`: `clerkMiddleware()` with no `protect()`, so `/api/*` isn't blocked by Clerk. The admin secret is the gate.
- `package.json`: no `cheerio` or `zod`. There is no `app/api/` directory.
- `.env.local` (presence only, values never printed): `OXY_WSA_USERNAME` and `OXY_WSA_PASSWORD` are set. **`SKEW_ADMIN_SECRET` is missing**, and the user must add it before testing.
- `.env.example`: has Clerk and Supabase vars, but no Oxylabs or admin vars.
- The previous prompt `prompts/supabase-database.md` notes that `raw_text` should use **blank lines between paragraphs**, because the details page splits on them.

## Decisions or assumptions

- **Default selection:** all active sources, up to 5 valid articles per source (`DEFAULT_ARTICLES_PER_SOURCE`). The request body can narrow this, per section 8.
- **Request body** (optional JSON, validated with Zod):
  ```json
  { "sources": ["NPR", "BBC News"], "perSource": 3 }
  ```
  - `sources` is an optional array of 1–20 trimmed non-empty source names, matched case-insensitively against active sources.
  - `perSource` is an optional integer from 1 to `MAX_ARTICLES_PER_SOURCE` (10).
  - An empty body or `{}` means the defaults.
  - Requested names that don't match an active source are reported in the summary as `unknownSources`. If none match, respond `400`.
- **Oxylabs Realtime for both homepage and detail pages.** Publisher sites block direct fetches, so all HTML comes through Oxylabs `universal`. No direct `fetch` to publisher sites.
- **Rendering:** no `render` by default. Each parser strategy can opt into `render: "html"` if its homepage cards are client-rendered. All five start with no render, and we switch one only if live testing shows empty card extraction.
- **Source-specific parser strategies live in code, keyed by `sources.parser_strategy`.** They contain URL *patterns* and selectors, never source URLs. Section 7 forbids hardcoded source URLs, not path patterns. Strategies: `reuters`, `npr`, `foxnews`, `bbc`, `guardian`, and `generic` as the fallback.
  - A one-time data update sets each source's `parser_strategy`. It runs via the Supabase MCP `execute_sql`, and `supabase/seed.sql` is updated to match:

  ```sql
  update public.sources set parser_strategy = 'reuters'  where name = 'Reuters';
  update public.sources set parser_strategy = 'npr'      where name = 'NPR';
  update public.sources set parser_strategy = 'foxnews'  where name = 'Fox News';
  update public.sources set parser_strategy = 'bbc'      where name = 'BBC News';
  update public.sources set parser_strategy = 'guardian' where name = 'The Guardian';
  ```

  - An unknown `parser_strategy` value falls back to `generic` with a console warning.
- **Candidate budget:** to reach `perSource` valid articles, scrape candidates in order until `perSource` are inserted or `MAX_DETAIL_ATTEMPTS_PER_SOURCE = perSource * 2` (capped at 20) detail pages have been tried. This puts a hard ceiling on Oxylabs cost per run.
- **Concurrency:**
  - Sources are processed sequentially.
  - Detail pages within a source run in small parallel waves of `DETAIL_SCRAPE_CONCURRENCY = 3`.
  - Each Oxylabs call has a 90 s timeout (180 s when `render: "html"`) via `AbortSignal.timeout`.
  - Retry once on 429/5xx/timeout with a 2 s backoff. Other errors aren't retried.
- **`maxDuration = 300`** on `/api/scrape`. A full 5-source × 5-article run should fit. Narrowing with `sources`/`perSource` is the escape hatch locally.
- **Metadata extraction order** (first non-empty wins):
  - **Title:** JSON-LD `NewsArticle`/`Article`/`ReportageNewsArticle` `headline`, then `og:title`, then the first `h1`. Strip trailing ` | Source` / ` - Source` suffixes.
  - **Canonical URL:** `link[rel=canonical]`, then `og:url`. Normalized. Must still pass the strategy's article URL check, or the page is rejected as `canonical_not_article`.
  - **Image:** JSON-LD `image` (string, array, or `{url}`), then `og:image`, then `twitter:image`. Must be absolute `https:`.
  - **Published date:** JSON-LD `datePublished`, then `meta[property=article:published_time]`, then `meta[name=pubdate|publish-date|date]`, then the first `time[datetime]` inside the article body. Must parse to a valid date, not more than 1 day in the future.
  - **Body:** JSON-LD `articleBody` when it is ≥ 900 characters, else the strategy's body selectors, else the generic `article p` / `[itemprop=articleBody] p` / `main p`.
- **Text output format:** paragraphs joined by `\n\n`, matching the details page's `splitParagraphs`.
- **URL normalization:**
  - Resolve relative to the page URL, force `https:`, and lowercase the host.
  - Drop the hash and all query params. None of the five sources need query params for article identity.
  - Drop a trailing slash except on the root.
  - The same normalization applies to `original_url` and `canonical_url` before the existence check.
- **Same-site rule:** a candidate must be on the source's own host (`www.` ignored). Off-site links (e.g. `foxbusiness.com`, `bbc.co.uk/sport`) are rejected as `off_site`.
- **Logging:**
  - Console lines use a `[scrape]` prefix.
  - `logs` table rows are limited to scrape started, each source-level error, and scrape completed/failed (with the summary in `context`), so the table doesn't flood. Per-URL details stay in the console.
- **Admin secret check:** compare `x-skew-admin-secret` with `SKEW_ADMIN_SECRET` using `crypto.timingSafeEqual` over SHA-256 digests, so differing lengths don't leak timing. If the env var is unset, every request gets `401` and the server console logs a one-line warning that names the variable but never a value.
- **`GET /api/sources`:** returns `{ sources: [{ id, name, listing_url, parser_strategy }] }` for active sources only. No secret, since it's a read route and source data is non-sensitive. No Oxylabs calls.
- **Packages:** `cheerio@1.2.0` and `zod@4.6.7`, pinned exactly with pnpm. Zod is shared with the later AI task.

## Files likely to change

- `package.json`, `pnpm-lock.yaml`: add `cheerio@1.2.0` and `zod@4.6.7`.
- `lib/limits.ts`: add `MAX_ARTICLES_PER_SOURCE = 10`, `MAX_DETAIL_ATTEMPTS_PER_SOURCE_CAP = 20`, `DETAIL_SCRAPE_CONCURRENCY = 3`, `MIN_ARTICLE_PARAGRAPHS = 3`, `MIN_ARTICLE_CHARS = 900`, `OXYLABS_TIMEOUT_MS = 90_000`, and `OXYLABS_RENDER_TIMEOUT_MS = 180_000`.
- `lib/env/server.ts` (new, `server-only`): `getOxylabsCredentials()` and `getAdminSecret()`. These are missing-variable errors that never echo values.
- `lib/api/admin-auth.ts` (new, `server-only`): `isAuthorizedAdminRequest(request: Request): boolean`.
- `lib/scraping/oxylabs.ts` (new, `server-only`): `fetchHtmlViaOxylabs(url, { render? }): Promise<OxylabsHtmlResult>`.
- `lib/parsing/url.ts` (new): `normalizeUrl`, `isSameSite`.
- `lib/parsing/reject-list.ts` (new): the shared **non-article reject list** as path-segment and slug patterns.
- `lib/parsing/strategies.ts` (new): the `ParserStrategy` type, the five strategies plus `generic`, and `getParserStrategy(name)`.
- `lib/parsing/links.ts` (new): `extractCandidateLinks(html, pageUrl, strategy)`.
- `lib/parsing/article.ts` (new): `parseArticlePage(html, pageUrl, strategy)` returns `ParsedArticle`.
- `lib/parsing/clean.ts` (new): body cleanup and paragraph splitting.
- `lib/parsing/validate.ts` (new): `validateArticle(parsed, strategy)` returns `{ ok: true, article } | { ok: false, reason }`.
- `lib/pipeline/types.ts` (new): `RejectionReason` union, `ScrapeRunSummary`, `HomepageHtmlProvider`, `ScrapeOptions`.
- `lib/pipeline/logger.ts` (new, `server-only`): a console logger with the `[scrape]` prefix and a rejection-reason tally.
- `lib/pipeline/scrape.ts` (new, `server-only`): `runScrapePipeline(options)` and `liveHomepageProvider`.
- `app/api/scrape/route.ts` (new): a thin `POST` handler.
- `app/api/sources/route.ts` (new): a thin `GET` handler.
- `supabase/seed.sql`: append the `parser_strategy` updates.
- `.env.example`: add `OXY_WSA_USERNAME=`, `OXY_WSA_PASSWORD=`, and `SKEW_ADMIN_SECRET=`.

## Implementation requirements

### 1. Install

`pnpm add cheerio@1.2.0 zod@4.6.7`, with exact versions and committed lockfile changes.

### 2. Oxylabs client (`lib/scraping/oxylabs.ts`)

- `import "server-only"`.
- `POST https://realtime.oxylabs.io/v1/queries`.
  - Basic auth from `getOxylabsCredentials()`.
  - Body: `{ source: "universal", url, ...(render ? { render: "html" } : {}) }`.
- Parse the response with a Zod schema: `{ results: [{ content: string, status_code: number, url?: string }] }`.
- Return `{ ok: true, html, statusCode, finalUrl } | { ok: false, error: OxylabsError }`, where `OxylabsError` is `{ kind: 'auth' | 'rate_limited' | 'http' | 'timeout' | 'invalid_response' | 'target_status'; status?: number; message: string }`.
  - A target `status_code` outside 200–299 is `target_status`.
- Retry once for `rate_limited`, 5xx `http`, and `timeout`. Never retry `auth`.
- Never log credentials, auth headers, or full response bodies.

### 3. Non-article reject list (`lib/parsing/reject-list.ts`)

Encode the AGENTS.md section 9 list as path-segment checks that apply to every strategy:

- category/section: `section`, `sections`, `category`, `categories`
- topic/tag: `topic`, `topics`, `tag`, `tags`
- author: `author`, `authors`, `person`, `people`, `profile`, `contributors`
- search: `search`
- show/program/podcast: `show`, `shows`, `program`, `programs`, `programmes`, `podcast`, `podcasts`, `series`, `audio`, `sounds`
- live: `live`, `live-news`, `live-updates`
- game: `game`, `games`, `crossword`, `crosswords`, `puzzles`, `quiz`
- product/review/shopping: `shop`, `shopping`, `deals`, `coupons`, `product`, `products`, `reviews`, `thefilter`, `thefilter-us`, `underscored`
- corporate/support: `about`, `help`, `support`, `contact`, `careers`, `jobs`, `privacy`, `terms`, `info`, `corrections`, `advertise`, `press`
- newsletter/subscription: `newsletter`, `newsletters`, `subscribe`, `subscription`, `signup`, `sign-in`, `account`, `donate`
- video-only: `video`, `videos`, `watch`, `av`, `gallery`, `galleries`, `picture`, `pictures`

Export `matchesRejectList(pathname): RejectionReason | null`. It returns a specific reason (`reject_category`, `reject_live`, and so on) so the summary can group by count.

The homepage URL itself, or any path with fewer than 2 meaningful characters, is rejected as `homepage`.

### 4. Parser strategies (`lib/parsing/strategies.ts`)

```ts
type ParserStrategy = {
  name: ParserStrategyName; // "reuters" | "npr" | "foxnews" | "bbc" | "guardian" | "generic"
  render: boolean;
  cardLinkSelectors: string[];     // scoped selectors for visible story cards
  excludeContainerSelectors: string[]; // nav, header, footer, menus, etc. (always includes generic ones)
  isArticlePath: (pathname: string) => boolean;
  bodySelectors: string[];
  bodyNoiseSelectors: string[];
};
```

`getParserStrategy(name: string)` maps a DB value to a strategy, using an exhaustive switch with a `never` check and the generic fallback for unknown strings.

Article path rules. Each runs after the reject list, and every rule is anchored and strict:

| Strategy | Accept when the path matches |
| --- | --- |
| `reuters` | ends in `-YYYY-MM-DD` (optionally with a trailing slash), at least 2 segments, and a slug with ≥ 3 hyphenated words. `/world/africa` is rejected. |
| `npr` | `^/YYYY/MM/DD/` followed by an id or slug segment (e.g. `/2026/11/16/nx-s1-…/slug` or `/2026/11/16/g-s1-…/slug`). `/sections/politics` is rejected. |
| `foxnews` | exactly 2 segments, `/<section>/<slug>`, where the slug has ≥ 4 hyphenated words and isn't purely a section name. Any path containing `shows`, `video`, `live-news`, or `games` is rejected by the reject list. |
| `bbc` | `^/news/articles/[a-z0-9]{8,}$` or `^/news/[a-z-]+-\d{6,}$`. `/sport/…`, `/news/live/…`, and `/news/topics/…` are rejected. |
| `guardian` | `^/[a-z-]+(/[a-z-]+)?/\d{4}/[a-z]{3}/\d{2}/[a-z0-9-]+$`, where the segments don't include `live`, `video`, `gallery`, `audio`, or `picture`. `/us/environment` and `/thefilter-us` are rejected. |
| `generic` | a date segment (`/YYYY/MM/DD/` or `-YYYY-MM-DD`) **or** a final slug with ≥ 5 hyphenated words, plus at least 2 path segments. |

Card selectors:

- Prefer elements inside `main`, story-card containers (`article`, `[data-testid*="card" i]`, `[class*="story" i]`, `[class*="card" i]`), and heading links (`h2 a`, `h3 a`).
- Always exclude links inside `nav`, `header`, `footer`, `aside`, `[role=navigation]`, `[class*="menu" i]`, `[class*="footer" i]`, `[class*="newsletter" i]`, and `[class*="promo" i]`.
- Each strategy can add selectors. The exact selectors are tuned during live testing, and any tuning changes are listed in the summary.

### 5. Link extraction (`lib/parsing/links.ts`)

`extractCandidateLinks(html, pageUrl, strategy)` returns `{ candidates: string[]; rejected: { url: string; reason: RejectionReason }[] }`.

1. Load the HTML with Cheerio and remove the exclude containers.
2. Collect `href`s from the card selectors, in document order, which keeps homepage prominence.
3. Then for each link:
   - Skip `mailto:`, `javascript:`, and `#` links.
   - `normalizeUrl` it.
   - Reject `off_site`.
   - Reject the reject-list match.
   - Reject `not_article_url` when `isArticlePath` is false.
4. Dedupe after normalization, keeping the first occurrence.

### 6. Article parsing, cleanup, validation

**`parseArticlePage`**:

- Extracts the title, canonical URL, image URL, published date, and body using the order in Decisions.
- JSON-LD is read from every `script[type="application/ld+json"]`. It is parsed safely, supports `@graph` and arrays, and invalid JSON is skipped.
- Every extracted field is plain text. HTML is never kept.

**`clean.ts`** removes these from the body container before reading text:

- `script`, `style`, `noscript`, `iframe`, `svg`, `form`, `button`, `figure figcaption`
- ad and related blocks: `[class*="ad-" i]`, `[class*="advert" i]`, `[class*="related" i]`, `[class*="most-viewed" i]`, `[class*="newsletter" i]`, `[class*="subscribe" i]`, `[class*="share" i]`, `[class*="social" i]`, `[aria-hidden="true"]`
- the strategy's `bodyNoiseSelectors`

It then drops paragraphs that:

- are under 40 characters with no sentence punctuation
- match boilerplate patterns (`/^(advertisement|read more|load more|sign up|subscribe|share this|follow us|click here|watch:|listen:)/i`)
- look like CSS/JS dumps (contain `{` and `:` and `;`, or `function(`, or `window.`)
- exactly duplicate an earlier paragraph

If cleanup leaves one block of 1,500 characters or more, split it into paragraphs of about 3–5 sentences on sentence boundaries (`(?<=[.!?]["”’)]?)\s+(?=[A-Z“"])`). This satisfies the section 13 rule against single-paragraph rejection.

The output is the paragraphs joined with `\n\n`.

**`validateArticle`** returns the first failing reason:

| Check | Reason |
| --- | --- |
| No title | `missing_title` |
| Generic title: length < 15, the title equals the source name, or it matches category/show/program/podcast/live/game/product/corporate words alone (e.g. "Politics", "World News", "Live updates", "Podcasts") | `generic_title` |
| No `https` image | `missing_image` |
| No valid published date | `missing_published_date` |
| Canonical URL off-site or failing `isArticlePath`/reject list | `canonical_not_article` |
| Body has fewer than 3 meaningful paragraphs **and** fewer than 900 meaningful characters | `thin_body` |
| More than 50 % of paragraphs are short link-like lines or headline lists (≤ 12 words, no terminal punctuation) | `body_mostly_headlines` |

Only valid pages produce an `ArticleInsert`:

```ts
{ source_id, original_url, canonical_url, title, image_url, published_at /* ISO */, raw_text }
```

`canonical_url` is `null` when it equals `original_url`, which avoids pointless unique collisions.

### 7. Pipeline (`lib/pipeline/scrape.ts`)

```ts
type HomepageHtmlProvider = (source: SourceRow, strategy: ParserStrategy)
  => Promise<{ ok: true; html: string; url: string } | { ok: false; error: string }>;

type ScrapeOptions = {
  sourceNames?: string[];
  perSource?: number;
  homepageProvider?: HomepageHtmlProvider; // defaults to liveHomepageProvider
  trigger: "manual" | "scheduler";
};

export async function runScrapePipeline(options: ScrapeOptions): Promise<ScrapeRunSummary>;
```

Flow, per AGENTS.md section 9:

1. Log "scrape started", along with `insertLog` (info).
2. Load sources with `listActiveSources({ names })`. Log the selected names and any unknown names.
3. For each source, sequentially:
   1. Log "source started".
   2. Get the homepage HTML from the provider, and log "homepage fetched (N KB)".
   3. Extract candidates and log the count found and rejected.
   4. Run `findExistingArticleUrls(candidates)` and log the duplicates skipped.
   5. Process the remaining candidates in waves of `DETAIL_SCRAPE_CONCURRENCY`. Stop once `perSource` valid articles are collected or the attempt cap is reached.
      - Scrape each candidate, parse, and validate.
      - Check the parsed canonical URL against existing URLs. If it's already stored, count it as a duplicate.
   6. Insert the valid rows with `insertArticles`. The DB-level duplicates it reports are counted in `duplicatesSkipped`.
   7. Log the articles inserted and rejected after validation.
   8. Any thrown error in a source is caught. It's logged as a source-level error (console plus `insertLog` error) and counted, and the run continues with the next source.
4. Build the summary, then log "scrape completed" or "scrape failed" with `insertLog` (the summary is in `context`).

Status:

- `completed`: no source errors.
- `partial`: some sources errored.
- `failed`: all sources errored, or source loading failed.

`ScrapeRunSummary`:

```ts
{
  status: "completed" | "partial" | "failed";
  trigger: "manual" | "scheduler";
  sourcesChecked: number;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;        // Oxylabs/detail fetch failures
  durationMs: number;
  rejectionReasons: Record<string, number>;
  perSource: { name: string; inserted: number; rejected: number; failed: number; error?: string }[];
  unknownSources?: string[];
}
```

Console format: short single lines, for example:

```
[scrape] started (manual) sources=5 perSource=5
[scrape] NPR: homepage fetched (412 KB)
[scrape] NPR: candidates found=38 rejected=21 duplicates=0
[scrape] NPR: inserted=5 rejected=2 failed=0
[scrape] completed in 84.2s
```

The final summary is printed with `console.log("[scrape] summary", summary)`.

`RejectionReason` is a string-literal union. Every `switch` over it uses a `never` default.

### 8. Route handlers (thin)

**`app/api/scrape/route.ts`**:

```ts
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // parse optional JSON body with Zod (empty body allowed) → 400 { error, issues } on invalid
  // runScrapePipeline({ sourceNames, perSource, trigger: "manual" })
  // 200 with summary; 400 if no requested source matched; 500 { error: "Scrape failed" } on unexpected throw (details server-side only)
}
```

**`app/api/sources/route.ts`**: `GET` returns active sources with `{ id, name, listing_url, parser_strategy }`. A query failure returns `500 { error: "Failed to load sources" }`.

Neither route exports `dynamic`, which is incompatible with `cacheComponents`. Route handlers that read the request are dynamic by default.

### 9. Data update and seed

- Run the five `parser_strategy` updates from Decisions via the Supabase MCP `execute_sql` on project `mznnbhnyrphzbousrvre`.
- Verify with `select name, parser_strategy from sources order by name`.
- Append the same `update` statements to `supabase/seed.sql` so a fresh database matches. Both stay idempotent.

### 10. `.env.example`

Append these with placeholders only:

```
OXY_WSA_USERNAME=
OXY_WSA_PASSWORD=
SKEW_ADMIN_SECRET=
```

Do not read values from `.env.local` or edit it. The user adds `SKEW_ADMIN_SECRET`.

### 11. Don't change

- UI, existing query functions (beyond reuse), schema, or `proxy.ts`.
- No Scheduler, cron, or analysis code.

## Security requirements

- `/api/scrape` requires `x-skew-admin-secret` matching `SKEW_ADMIN_SECRET`.
  - The comparison is timing-safe.
  - A missing or invalid secret gets `401`, and so does an unset server secret.
  - The secret is never accepted from the query string.
- Oxylabs credentials, the admin secret, and the service role key are read only in `server-only` modules. Nothing is exposed via `NEXT_PUBLIC_*`.
- Logs and error responses never include credentials, auth headers, secrets, or raw Oxylabs response bodies. 500 responses are generic.
- SSRF: the pipeline only fetches URLs that are either a stored `listing_url` or a same-site candidate that passed normalization and the strategy check. Request bodies can't supply URLs, only source names.
- Scraped HTML is never stored or rendered. Only cleaned plain text, plus `https` image and article URLs, are saved.
- The body size is bounded: Zod caps `sources` at 20 entries and `perSource` at 10.
- Append-only inserts. Nothing is deleted or updated in `articles`.
- `GET /api/sources` returns only non-sensitive source fields.

## Acceptance criteria

- `POST /api/scrape` without the header, or with a wrong one, returns `401`. With the correct header it runs and returns the summary JSON described above.
- A body of `{"sources":["NPR"],"perSource":2}` scrapes only NPR and inserts at most 2 articles.
- `{"sources":["Nope"]}` returns `400` with `unknownSources`.
- `{"perSource":50}` returns `400`.
- Every inserted article:
  - has an article-specific same-site URL, a non-generic title, an `https` image, a valid `published_at`, and a body with either 3 or more paragraphs or at least 900 characters
  - has `raw_text` paragraphs separated by blank lines, with no script/CSS/newsletter/share text
- No homepage, section, category, topic, author, live, show, podcast, video, game, product, or corporate URL is inserted.
- Running the same scrape twice inserts no duplicates. The second run reports them in `duplicatesSkipped`.
- No `.in()` query receives more than 15 URLs (reusing `findExistingArticleUrls`).
- A failing source doesn't abort the run. Status becomes `partial`, and the error appears in `perSource` and `logs`.
- The dev-server console shows the progress lines and the final summary. `logs` gets a start row, a completion row, and a row per source error.
- `GET /api/sources` lists the five active sources with their new `parser_strategy` values.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Checks to run

```
npm run typecheck
npm run lint
npm run build
```

Plus live verification during implementation, which uses Oxylabs credits:

- A 1-source, 2-article run per source to tune card selectors. One source at a time keeps cost low.
- Query the inserted rows to inspect titles, URLs, dates, and the start of `raw_text`.

## Manual test steps (after implementation)

1. Add a secret to `.env.local` (any long random string), then restart the dev server:
   ```
   SKEW_ADMIN_SECRET=<long-random-string>
   ```
2. Start the dev server and watch its terminal for `[scrape]` lines:
   ```bash
   npm run dev
   ```
3. List active sources:
   ```bash
   curl http://localhost:3000/api/sources \
     -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET"
   ```
4. Confirm the route rejects a missing secret (expect `401`):
   ```bash
   curl -i -X POST http://localhost:3000/api/scrape
   ```
5. Run a small scrape (one source, two articles):
   ```bash
   curl -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" \
     -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET" \
     -d '{"sources":["NPR"],"perSource":2}'
   ```
6. Run the full default scrape (all active sources, 5 each; this can take a few minutes):
   ```bash
   curl -X POST http://localhost:3000/api/scrape \
     -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET"
   ```
7. Re-run step 5 and confirm `articlesInserted` is `0` or only new stories, with the repeats counted in `duplicatesSkipped`.
8. In Supabase **SQL Editor**, inspect the results:
   ```sql
   select s.name, a.title, a.original_url, a.published_at, left(a.raw_text, 200) as preview
   from articles a join sources s on s.id = a.source_id
   order by a.scraped_at desc limit 20;

   select level, message, created_at from logs where scope = 'scrape' order by created_at desc limit 10;
   ```
9. New articles won't appear on `/` until AI analysis runs (`analyzed_at` set). That's the next task.
