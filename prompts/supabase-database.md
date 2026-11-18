# Supabase database and data access

## Goal

Give Skew its Supabase persistence layer:

- The six core tables from AGENTS.md section 7 (`sources`, `articles`, `article_analyses`, `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs`), applied to the `skew_news` project and recorded in `supabase/schema.sql`.
- One server-only, typed Supabase client that uses the service role key.
- Typed query functions for each table that later tasks (scraping, scheduler, AI analysis, logs) can call without writing new Supabase code.
- `supabase/seed.sql`: a separate seed file, kept out of `schema.sql`, that inserts the five user-approved active sources so later scraping work has sources to load.
- The home feed and the news details page read stored data through those query functions. They show empty or fallback states until scraping and analysis run. The demo data is removed. The components are reshaped from the mock's multi-source cluster model to Skew's one-article, one-source, one-analysis model.

Out of scope, each handled by its own later task:

- API routes.
- Related articles. The section's component stays, but it renders only when it has items, and section 20 supplies them.
- pgvector, the `embedding` column, and `getRelatedArticles`. These come in AGENTS.md section 20.
- Zod. The AI analysis task installs it.

## Skills read

- `.agents/skills/supabase/SKILL.md`:
  - Check the changelog first.
  - Enable RLS on every table in `public`.
  - New `public` tables get `anon`/`authenticated` grants by default, so revoke them explicitly.
  - Never expose the service role key.
  - Pin package versions.
  - Use `execute_sql` while iterating, then run the advisors to verify.
- `https://supabase.com/changelog.md`: no breaking change affects this work. The Postgres 17.11 notes cover only ltree, pgcrypto PGP legacy ciphers, btree_gist on floats, and custom operators, and this schema uses none of them.
- `https://supabase.com/docs/guides/api/securing-your-api.md`: the default-privileges table confirms that new `public` tables are reachable by `anon` and `authenticated` unless grants are revoked.
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`: put database access in a Data Access Layer module marked with `import 'server-only'`.
- `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` and `08-caching.md`: under `cacheComponents`, uncached data has to be wrapped in `<Suspense>` (with `connection()` to defer it to request time) or cached with `'use cache'` plus `cacheLife`.
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`: external `src` values need `remotePatterns`, or the `unoptimized` prop to skip the optimizer.

## Existing code inspected

- `package.json`: Next 16.4.6, React 19.3.0, pnpm. It has `typecheck` and `lint` scripts. No Supabase packages, `server-only`, or Zod.
- `next.config.ts`: `cacheComponents: true`. This doesn't matter yet because no page reads Supabase in this task.
- `.env.local`: values not printed. `NEXT_PUBLIC_SUPABASE_URL` points at project ref `mznnbhnyrphzbousrvre` (`skew_news`). The keys use the new `sb_publishable_…` / `sb_secret_…` format, stored under `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
- `.env.example`: Clerk variables only.
- Supabase MCP shows `skew_news` as `ACTIVE_HEALTHY` on Postgres 17. `public` has no tables. pgvector (`vector` 0.8.2) is available but not installed. `pgcrypto` is installed, and `gen_random_uuid()` is built into Postgres 17.
- `components/home/stories.ts`: the demo `Story[]` plus `topics`. `site-header.tsx` imports `topics`.
- `components/article/article.ts`: the demo `Article` (author, caption, credit, sources count, sourceShares, outlets, related), `BiasLean`, and `getArticle()`.
- `app/page.tsx`: renders `stories` synchronously, and only `trump-iran` links to a details page.
- `components/home/news-card.tsx`:
  - Takes `Story`.
  - Shows `topic · place`, the title, a compact `BiasMeter`, and "N sources".
  - Has a decorative Info button.
- `app/news/[id]/page.tsx`: calls `auth.protect()` first. Also has `generateStaticParams` returning `trump-iran`, plus `generateMetadata` and `getArticle`.
- `app/news/[id]/loading.tsx` and `not-found.tsx`: already exist and are reused.
- `components/article/article-page.tsx`:
  - Main column: topic/place, title, byline with author and read time, Save/Share/More buttons, hero image with caption and credit, Bias Distribution meter with "N sources", paragraphs, and Related Stories.
  - Aside: Bias Analysis (overall lean computed from the largest share, "Based on N balanced sources", and copy about publication leaning and source weighting), AI Summary (bullet list), and Source Breakdown (shares by lean, top outlets).
  - `leanClass` and `shareFill` use exhaustive switches over `BiasLean`.
- `components/article/bias-rows.tsx`, `components/ui/bias-meter.tsx`: presentational and percentage-based, so they're reused unchanged.
- `components/design-system/board.tsx`: doesn't use the demo data, so it's unaffected.
- There is no `lib/` or `supabase/` directory yet.

## Decisions or assumptions

- **Scope, approved by the user:** the database and data layer, plus wiring the home and details pages. The schema is applied through the Supabase MCP. The pages show empty or fallback states until the pipeline runs.
- **Seed sources, approved by the user:** `supabase/seed.sql` inserts these five rows. All are `is_active = true`, `parser_strategy = 'generic'`, and `logo_url = null`. The user confirmed every name and URL, so none are invented. They are stored only in the seed file and the database, never in scraping code or `AGENTS.md`.

  | name | listing_url |
  | --- | --- |
  | Reuters | `https://www.reuters.com/` |
  | NPR | `https://www.npr.org/` |
  | Fox News | `https://www.foxnews.com/` |
  | BBC News | `https://www.bbc.com/news` |
  | The Guardian | `https://www.theguardian.com/us` |

  The seed is idempotent. It uses `on conflict do nothing` with no conflict target, so it skips rows that collide on either the unique `name` or the unique `listing_url`, and it never overwrites rows the user has edited. Source-specific `parser_strategy` values are set later by the scraping task.
- **Rendering under `cacheComponents`:** both pages stream fresh data at request time.
  - Home keeps its header and the "Top News" heading in the static shell. The feed is an async Server Component inside `<Suspense>`, with a skeleton fallback. It calls `await connection()` before querying.
  - The details page is already request-time because of `auth.protect()`, and `loading.tsx` remains its boundary.
  - No `'use cache'` for now, so a build never needs database access. Caching with `cacheTag('articles')` plus `revalidateTag` from the pipeline is a possible follow-up.
- **Remote images:** article images come from many publisher domains, so add **no** wildcard `remotePatterns`. A `**` pattern would turn `/_next/image` into an open image proxy. Article `<Image>`s use `unoptimized` and render only `https://` URLs. Anything else falls back to a neutral `bg-panel-muted` block.
- **Mock-to-schema mapping:**

  | Mock field | Replacement |
  | --- | --- |
  | `topic · place` | `source name · published date` |
  | `N sources` / "Based on N balanced sources" | "AI-estimated" line with confidence |
  | Overall lean (largest share) | stored `bias_label` (left/center/right/mixed/unclear); show the matching share only for left/center/right |
  | Author byline | source name, published date, and read time derived from `raw_text` (about 230 words per minute) |
  | Caption and credit | removed |
  | Hardcoded paragraphs | `raw_text` split on blank lines, or on single newlines when there are no blank lines |
  | Summary bullets | stored `summary`, split on newlines into paragraphs |
  | Source Breakdown and Top Sources | replaced by **Sentiment**, **Framing Notes**, and **Loaded Terms** |
  | Static methodology copy | stored `disclaimer` |
  | Related Stories | `RelatedStories` renders only when `items.length > 0`, and receives `[]` until section 20 |

  - Sentiment shows the label and the signed score.
  - Loaded terms render as non-interactive pills.
  - The methodology copy is replaced because it described publication-level source weighting, which Skew doesn't do.
  - Raw text should use blank lines between paragraphs. That convention is noted here for the scraping task.
- **Decorative controls stay** (Save, Share, More, the Info buttons, "How We Analyze Bias", "Provide Feedback", the newsletter form). They're unchanged design elements and out of scope. "View All Sources" goes away along with Source Breakdown.
- **A "Read original" link** goes in the byline row. It uses `canonical_url ?? original_url`, `target="_blank"`, and `rel="noopener noreferrer"`, and renders only for `http(s)` URLs.
- **Remove the demo data:** delete `components/article/article.ts` and the `stories`/`Story` exports. `topics` moves to `components/home/topics.ts`, and `stories.ts` is deleted. The demo images in `public/home` and `public/news` stay for now. Removing them is unrelated cleanup.
- **`generateStaticParams` is removed** from the details page. IDs are UUIDs and aren't known at build time.
- `getArticleDetail` is wrapped in React `cache()`, so `generateMetadata` and the page share one query per request.
- **Root `app/error.tsx`** (Client Component): "We couldn't load stories right now," plus a Retry button that calls `reset()`. A Supabase outage then shows a calm message instead of a crash page. It never renders `error.message`.
- **All access goes through the service role on the server.** Skew uses Clerk, not Supabase Auth, so the `anon` and `authenticated` roles mean nothing here. Every table:
  - has RLS enabled with **no policies**
  - has **all privileges revoked** from `anon` and `authenticated`

  The publishable/anon key therefore can't read or write anything through the Data API. The UI will read stored data through server-only query functions, as AGENTS.md section 20 already requires for `getRelatedArticles`. `NEXT_PUBLIC_SUPABASE_ANON_KEY` stays in the env list but nothing uses it.
- **UUID primary keys** (`gen_random_uuid()`) for every entity table, so article URLs look like `/news/<uuid>`. `logs` uses a `bigint generated always as identity` key because it is append-heavy.
- **`bias_score` is a generated column:** `(right_percentage - left_percentage) / 100.0`, stored. The database guarantees the AGENTS.md formula, and the AI layer never writes the value. Generated types mark it as non-insertable.
- **Percentages are `smallint` from 0 to 100**, with a check that the three add up to 100. The AI layer rounds before saving.
- **`framing_notes` and `loaded_terms` are `text[]`**, defaulting to `'{}'`, so the details page can render them as lists.
- **Oxylabs IDs are stored as `text`.** AGENTS.md section 18 warns that 64-bit IDs lose precision as JS numbers. Storing them as text keeps them exact end to end.
- **`oxylabs_schedule_runs` has one row per Oxylabs job.** The unique `oxylabs_job_id` lets scheduler processing skip jobs it has already handled. The Scheduler task may adjust columns after reading the live Oxylabs docs, as section 18 requires.
- **Pending-analysis check** (section 19, LEFT JOIN): `articles` uses `select('…, article_analyses!left(id)')` with `.is('article_analyses', null)`. This is PostgREST's anti-join on an embedded resource. It filters on the embed itself, not `.eq('foreignTable.column')`, so it avoids the gotcha in section 21. It doesn't look at `analyzed_at`. I'll verify it against the live REST API during implementation. If it misbehaves, the fallback is a `SECURITY INVOKER` SQL function `pending_analysis_articles(p_limit int)` with `execute` revoked from `anon` and `authenticated`.
- **Append-only inserts:** articles are inserted with `upsert(..., { onConflict: 'original_url', ignoreDuplicates: true })`. That compiles to `ON CONFLICT DO NOTHING`, so it never updates or replaces existing rows. Callers still run the URL existence check first.
- **URL existence check:** one centralized limit, `URL_EXISTENCE_CHUNK_SIZE = 15`. Each chunk queries `original_url` and `canonical_url` with `.in()` and never passes more than 15 URLs per filter.
- **Types:** generate the `Database` type with the Supabase MCP `generate_typescript_types` after the schema is applied. Save it to `lib/supabase/database.types.ts` without hand edits. Put convenience aliases and the joined result types in `lib/supabase/types.ts`, the file AGENTS.md names.
- **Package versions:** `@supabase/supabase-js` pinned to the exact current version (2.119.0) and `server-only` 0.0.1, installed with pnpm.
- **No `@supabase/ssr`.** No Supabase Auth or cookie sessions are involved.

## Files likely to change

- `package.json`, `pnpm-lock.yaml`: add `@supabase/supabase-js` (exact version) and `server-only`.
- `supabase/schema.sql` (new): the full schema, which is the source of truth.
- `supabase/seed.sql` (new): the five source rows. It contains data only, no DDL.
- `lib/supabase/env.ts` (new): server-only reader for the required env vars, with clear errors.
- `lib/supabase/server.ts` (new): `getSupabaseAdmin()`, a lazily created service-role client.
- `lib/supabase/database.types.ts` (new, generated).
- `lib/supabase/types.ts` (new): row/insert aliases and joined result types.
- `lib/limits.ts` (new): `URL_EXISTENCE_CHUNK_SIZE`, `DEFAULT_ARTICLES_PER_SOURCE = 5`, `DEFAULT_ANALYSIS_BATCH_SIZE = 5`.
- `lib/supabase/queries/sources.ts` (new)
- `lib/supabase/queries/articles.ts` (new)
- `lib/supabase/queries/analyses.ts` (new)
- `lib/supabase/queries/logs.ts` (new)
- `lib/supabase/queries/oxylabs.ts` (new)
- `.env.example`: add the Supabase variables with placeholders.
- `lib/format.ts` (new): pure display helpers for dates, read time, labels, confidence, paragraph splitting, and URL checks.
- `app/page.tsx`: static shell plus `<Suspense>` around the feed.
- `components/home/news-feed.tsx` (new): async Server Component that queries the feed and renders the grid or the empty state.
- `components/home/news-feed-skeleton.tsx` (new)
- `components/home/news-card.tsx`: takes `ArticleCard`.
- `components/home/topics.ts` (new): `topics` moved out of `stories.ts`.
- `components/home/site-header.tsx`: import path for `topics` only.
- `components/home/stories.ts`: deleted.
- `components/article/article.ts`: deleted.
- `components/article/article-page.tsx`: takes `ArticleDetail` and is reshaped as described.
- `components/article/related-stories.tsx` (new): extracted from `article-page.tsx`, and renders nothing when the list is empty.
- `app/news/[id]/page.tsx`: uses `getArticleDetail`, and `generateStaticParams` is removed.
- `app/error.tsx` (new)

## Implementation requirements

### 1. Install

`pnpm add @supabase/supabase-js@2.119.0 server-only@0.0.1`. Pin exact versions and commit the lockfile changes.

### 2. `supabase/schema.sql`

The whole file must be idempotent where practical (`create table if not exists`, `create index if not exists`, `create or replace function`), and it must match exactly what gets applied.

**Shared**

- `public.set_updated_at()` trigger function.
- It is `language plpgsql` and `security invoker`, with `set search_path = ''`.
- It sets `new.updated_at = now()`.
- After creating it, revoke `execute` from `public`, `anon`, and `authenticated`.

**`sources`**

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | primary key, default `gen_random_uuid()` |
| `name` | `text` | not null, unique |
| `listing_url` | `text` | not null, unique, check `listing_url ~ '^https?://'` |
| `parser_strategy` | `text` | not null, default `'generic'` |
| `is_active` | `boolean` | not null, default `true` |
| `logo_url` | `text` | nullable |
| `created_at`, `updated_at` | `timestamptz` | not null, default `now()` |

- Add the `updated_at` trigger.
- Add a partial index on `(is_active) where is_active`.

**`articles`**

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `source_id` | `uuid` | not null, references `sources(id)` `on delete restrict` |
| `original_url` | `text` | not null, unique |
| `canonical_url` | `text` | nullable, unique |
| `title` | `text` | not null, check `length(btrim(title)) > 0` |
| `image_url` | `text` | not null |
| `published_at` | `timestamptz` | not null |
| `raw_text` | `text` | not null |
| `scraped_at` | `timestamptz` | not null, default `now()` |
| `analyzed_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | not null, default `now()` |

- Indexes:
  - `(source_id)`
  - `(published_at desc)`
  - `(analyzed_at desc) where analyzed_at is not null`, for home page listing

**`article_analyses`**

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `article_id` | `uuid` | not null, unique, references `articles(id)` `on delete cascade` |
| `summary` | `text` | not null |
| `sentiment_score` | `real` | not null, check between -1 and 1 |
| `sentiment_label` | `text` | not null, check in (`positive`, `neutral`, `negative`) |
| `bias_label` | `text` | not null, check in (`left`, `center`, `right`, `mixed`, `unclear`) |
| `left_percentage`, `center_percentage`, `right_percentage` | `smallint` | not null, each check between 0 and 100 |
| `bias_score` | `numeric(4,3)` | `generated always as ((right_percentage - left_percentage) / 100.0) stored` |
| `confidence` | `real` | not null, check between 0 and 1 |
| `framing_notes` | `text[]` | not null, default `'{}'` |
| `loaded_terms` | `text[]` | not null, default `'{}'` |
| `disclaimer` | `text` | not null |
| `model` | `text` | not null |
| `created_at` | `timestamptz` | not null, default `now()` |

- Table-level check: `left_percentage + center_percentage + right_percentage = 100`.
- Do **not** add `embedding`. Section 20 adds it.

**`logs`**

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `bigint` | `generated always as identity` primary key |
| `level` | `text` | not null, check in (`info`, `warn`, `error`) |
| `scope` | `text` | not null, check in (`scrape`, `analyze`, `scheduler`, `cron`) |
| `message` | `text` | not null |
| `context` | `jsonb` | not null, default `'{}'` |
| `created_at` | `timestamptz` | not null, default `now()` |

- Indexes: `(created_at desc)` and `(scope, created_at desc)`.

**`oxylabs_schedules`**

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `source_id` | `uuid` | not null, unique, references `sources(id)` `on delete cascade` |
| `schedule_id` | `text` | not null, unique, check `schedule_id ~ '^[0-9]+$'` |
| `cron_expression` | `text` | not null |
| `is_active` | `boolean` | not null, default `true` |
| `created_at`, `updated_at` | `timestamptz` | not null, default `now()` |

- Add the `updated_at` trigger.

**`oxylabs_schedule_runs`**

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | primary key |
| `schedule_id` | `text` | not null, references `oxylabs_schedules(schedule_id)` `on delete cascade` |
| `oxylabs_run_id` | `text` | nullable |
| `oxylabs_job_id` | `text` | not null, unique, check `~ '^[0-9]+$'` |
| `result_status` | `text` | not null |
| `processed_at` | `timestamptz` | nullable |
| `summary` | `jsonb` | nullable |
| `created_at` | `timestamptz` | not null, default `now()` |

- Index on `(schedule_id, created_at desc)`.

**Security block** (at the end of the file, for every table above):

```sql
alter table public.<t> enable row level security;
revoke all on table public.<t> from anon, authenticated;
```

Also revoke `usage` on the `logs` identity sequence from `anon` and `authenticated`. No policies are created. `service_role` bypasses RLS.

### 3. Apply and verify the schema (Supabase MCP, project `mznnbhnyrphzbousrvre`)

1. Run the file contents with `execute_sql`. Fix and rerun if it errors; the idempotent DDL allows that. Do **not** use `apply_migration`, per the skill.
2. Check the result with `list_tables` on `public`. All six tables should be present with RLS enabled.
3. Run the constraint tests below with `execute_sql`, inside `begin … rollback`. Each must behave as listed, and nothing may persist.
   - A valid source, article, and analysis insert succeeds. `bias_score` comes back as `(right - left) / 100`.
   - Percentages that don't add up to 100 are rejected.
   - A `bias_label` of `'far-left'` is rejected.
   - A duplicate `original_url` is rejected.
   - An article with a null `image_url` or `published_at` is rejected.
4. Check grants with `has_table_privilege('anon', 'public.articles', 'select')`. It must return `false` for every table and for both `anon` and `authenticated`.
5. Run `get_advisors` for `security` and `performance`. Fix every security finding. The only acceptable remaining notice is "RLS enabled, no policy", which is intended, and the summary must explain it.
6. Run `generate_typescript_types` and write the output to `lib/supabase/database.types.ts`.
7. **Seed** after steps 1–5 pass:
   - Write `supabase/seed.sql`:
     ```sql
     -- Skew source seed. Run after schema.sql. Safe to re-run.
     insert into public.sources (name, listing_url, parser_strategy, is_active, logo_url) values
       ('Reuters',      'https://www.reuters.com/',        'generic', true, null),
       ('NPR',          'https://www.npr.org/',            'generic', true, null),
       ('Fox News',     'https://www.foxnews.com/',        'generic', true, null),
       ('BBC News',     'https://www.bbc.com/news',        'generic', true, null),
       ('The Guardian', 'https://www.theguardian.com/us',  'generic', true, null)
     on conflict do nothing;
     ```
   - Run it with `execute_sql`, then run it a **second time** to prove it's idempotent.
   - `select name, listing_url, is_active from sources order by name` must return exactly these five rows, all active.

### 4. `lib/supabase/env.ts`

- Starts with `import "server-only"`.
- Exports `getSupabaseServerEnv(): { url: string; serviceRoleKey: string }`.
- It reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and throws `Error("Missing environment variable: <NAME>")` if either is missing or empty.
- The error must never include the value.

### 5. `lib/supabase/server.ts`

- Starts with `import "server-only"`.
- Exports `getSupabaseAdmin(): SupabaseClient<Database>`.
- The client is lazily created and memoized at module scope.
- Options: `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }`.
- No other client exists. There is no browser client.

### 6. `lib/supabase/types.ts`

- Generic helpers: `Tables<'x'>`, `TablesInsert<'x'>` (re-exported from the generated file if it provides them; otherwise defined there).
- Aliases:
  - `SourceRow`, `ArticleRow`, `ArticleInsert`, `ArticleAnalysisRow`, `ArticleAnalysisInsert`, `LogRow`, `LogInsert`, `OxylabsScheduleRow`, `OxylabsScheduleRunRow`
  - Literal unions: `SentimentLabel`, `BiasLabel`, `LogLevel`, `LogScope`
- Joined result types used by the queries:
  - `ArticleCard`: id, title, image_url, published_at, source `{ id, name, logo_url }`, and analysis `{ sentiment_label, bias_label, left_percentage, center_percentage, right_percentage, confidence }`.
  - `ArticleDetail`: the full article, source, and full analysis.
  - `PendingArticle`: id, source_id, title, raw_text, published_at.

### 7. `lib/limits.ts`

Export these as `as const` numbers:

- `URL_EXISTENCE_CHUNK_SIZE = 15`
- `DEFAULT_ARTICLES_PER_SOURCE = 5`
- `DEFAULT_ANALYSIS_BATCH_SIZE = 5`
- `MAX_LOG_PAGE_SIZE = 200`

`lib/limits.ts` does not import `server-only`, because the values are harmless.

### 8. Query modules (`lib/supabase/queries/*.ts`)

General rules for every module:

- Each module starts with `import "server-only"` and uses `getSupabaseAdmin()`.
- Each function is small and explicitly typed, and returns typed data.
- On a Supabase `error`, throw `new Error("<function>: <error.message>")`. Never swallow errors or return partial data silently.
- Don't use `any`.
- Don't use `.eq('table.column')` on joined tables.

**`sources.ts`**

- `listSources(): Promise<SourceRow[]>`: all sources, ordered by name. For `GET /api/sources`.
- `listActiveSources(filter?: { ids?: string[]; names?: string[] }): Promise<SourceRow[]>`: only `is_active = true`, optionally narrowed by ids or case-insensitive names. Filters apply in SQL with `.in()`. Names are matched in JS after a lowercase compare, to avoid ilike lists.

**`articles.ts`**

- `findExistingArticleUrls(urls: string[]): Promise<Set<string>>`:
  - Dedupe the input and drop empty strings.
  - Chunk by `URL_EXISTENCE_CHUNK_SIZE`.
  - For each chunk, run two queries: `.in('original_url', chunk)` and `.in('canonical_url', chunk)`.
  - Return every matched URL from either column.
  - Never pass more than 15 values to one `.in()`.
- `insertArticles(rows: ArticleInsert[]): Promise<{ inserted: ArticleRow[]; skipped: number }>`:
  - Append-only: `upsert(rows, { onConflict: 'original_url', ignoreDuplicates: true }).select()`.
  - `skipped` is `rows.length - inserted.length`.
  - An empty input returns early.
  - A unique-violation on `canonical_url` (Postgres `23505`) on a batch insert falls back to inserting rows one at a time, counting violations as skipped. This keeps append-only behavior without losing the valid rows.
- `listArticleCards(options?: { limit?: number }): Promise<ArticleCard[]>`:
  - Only articles where `analyzed_at` is not null and an analysis row exists. Use `article_analyses!inner(...)` on the embed. That is the join itself, not a column filter.
  - Ordered by `published_at desc`, default limit 30.
- `getArticleDetail(id: string): Promise<ArticleDetail | null>`:
  - Returns `null` for a non-UUID id without querying, for unknown ids, and for articles not yet analyzed.
  - Uses `.maybeSingle()`.
- `listPendingAnalysisArticles(limit: number): Promise<PendingArticle[]>`:
  - The LEFT JOIN anti-join described in Decisions (`article_analyses!left(id)` plus `.is('article_analyses', null)`).
  - Ordered by `scraped_at asc`.
  - Does **not** look at `analyzed_at`.
- `markArticleAnalyzed(id: string): Promise<void>`: sets `analyzed_at = now()` (ISO string from the server). The caller invokes it only after the analysis row is saved.

**`analyses.ts`**

- `insertArticleAnalysis(row: ArticleAnalysisInsert): Promise<ArticleAnalysisRow>`: a plain insert. Never upsert or overwrite. `bias_score` is omitted because it is generated.

**`logs.ts`**

- `insertLog(entry: { level: LogLevel; scope: LogScope; message: string; context?: Record<string, unknown> }): Promise<void>`.
  - It must **not throw**. Logging failures are written with `console.error` and swallowed, so a logging outage never breaks a pipeline run.
  - `context` is passed as JSON (`Json` from the generated types).
- `listLogs(options?: { scope?: LogScope; level?: LogLevel; limit?: number }): Promise<LogRow[]>`: newest first. `limit` is clamped to `MAX_LOG_PAGE_SIZE`, default 50.

**`oxylabs.ts`**

- `listOxylabsSchedules(): Promise<(OxylabsScheduleRow & { source: Pick<SourceRow, 'id' | 'name' | 'listing_url'> | null })[]>`.
- `upsertOxylabsSchedule(row: { source_id: string; schedule_id: string; cron_expression: string; is_active?: boolean }): Promise<OxylabsScheduleRow>`: upsert on `source_id`. The schedule row is configuration, not article data, so replacing it is allowed.
- `listStoredScheduleIds(): Promise<string[]>`: used for orphan deactivation.
- `findProcessedJobIds(jobIds: string[]): Promise<Set<string>>`: chunked by `URL_EXISTENCE_CHUNK_SIZE`, where `processed_at` is not null.
- `recordScheduleRun(row: { schedule_id: string; oxylabs_run_id?: string | null; oxylabs_job_id: string; result_status: string; processed_at?: string | null; summary?: Json | null }): Promise<void>`: upsert on `oxylabs_job_id`.
- Every ID parameter and return value is a `string`, never a `number`.

### 9. `.env.example`

Append these with placeholder values. Do not read or edit `.env.local`.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
```

### 10. Live verification of the query shapes

Without printing any key, run a one-off `curl` against `${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles`. Source the key from `.env.local` into a shell variable and keep it out of the output.

- With the service key, call `select=id,article_analyses!left(id)&article_analyses=is.null`. Expect `200` and `[]`.
- With the publishable key, call `select=id`. Expect `401`/`403` or a permission error, never data.

If the anti-join is rejected, switch to the SQL-function fallback described in Decisions, then update `schema.sql` and the generated types.

### 11. `lib/format.ts` (pure, no `server-only`)

These are used by Server Components only, but they're safe anywhere.

- `formatDate(iso: string): string`: `Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })`, for example "Nov 16, 2026". Using UTC keeps output deterministic.
- `toDateTimeAttr(iso: string): string`: the `YYYY-MM-DD` part.
- `readTime(text: string): string`: `max(1, round(words / 230))`, for example "4 min read".
- `formatConfidence(c: number): string`: for example "72% confidence".
- `formatSentimentScore(s: number): string`: signed with two decimals, for example "+0.15".
- `labelText(label: BiasLabel | SentimentLabel): string`: capitalized.
- `splitParagraphs(text: string): string[]`:
  - Split on `\n\s*\n`. If that yields one block, split on `\n` instead.
  - Trim each piece and drop empty ones.
- `isHttpsUrl(url: string | null): url is string` and `isHttpUrl(...)`: checked with `new URL()` and the protocol.

### 12. Home feed

**`app/page.tsx`**

- Stays a synchronous Server Component with the same `SiteHeader`, `<main>` classes, `h1` "Top News", and `SiteFooter`.
- Replace the `<ul>` with `<Suspense fallback={<NewsFeedSkeleton />}><NewsFeed /></Suspense>`.

**`NewsFeed`** (async)

- `await connection()`, then `listArticleCards({ limit: 30 })`.
- With results, render the same `<ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">`, where each `<li className="min-w-0">` holds a `<NewsCard article={…} />`.
- With no results, render the empty state (see Visual interpretation).

**`NewsCard`** (`article: ArticleCard`), always linked to `/news/${article.id}`:

- Image area:
  - If the image passes `isHttpsUrl`: `<Image unoptimized fill …>` with the same `sizes`/classes, wrapped in the existing aria-hidden `Link`.
  - Otherwise: `bg-panel-muted`.
  - The Info button stays.
- Meta line: `{source.name} · <time dateTime>{formatDate(published_at)}</time>`.
- Title: `h2` linked to the article, with the existing classes.
- `BiasMeter` with the stored percentages, `size="card" labels="compact"`.
- Footer line, replacing "N sources": `AI-estimated · {Label} framing · {Label} sentiment · {72% confidence}`.
- Remove the non-link branches, since every card now links.

**`NewsFeedSkeleton`**

- The same grid with 6 placeholder cards.
- Each card: the `rounded-lg border border-line bg-panel p-3` frame, a `bg-panel-muted` 16:10 block, and two text bars.
- `aria-busy="true"`, with an sr-only "Loading stories…".

### 13. News details page

**`app/news/[id]/page.tsx`**

- Keep `await auth.protect()` first.
- `const article = await getArticleDetail(id)`. Call `notFound()` when it's `null`.
- Render `<ArticlePage article={article} related={[]} />`.
- `generateMetadata` uses the same cached `getArticleDetail` and returns `{ title: article.title }`, or "Story not found".
- Delete `generateStaticParams`.
- If `next build` complains about metadata reading request-time data, follow the docs' remedy and note it in the summary.

**`ArticlePage`** (`article: ArticleDetail; related: RelatedArticle[]`)

- Keep the outer layout, grid, and every class token. Change only the content mapping from the Decisions table.
- Main column, in order:
  1. Meta line: `{source.name}`.
  2. `h1` title.
  3. Byline row:
     - Left: `{source.name} · <time>{date}</time> · {readTime(raw_text)}`, plus a "Read original" link styled `text-ink underline-offset-2 hover:underline` when the URL is valid.
     - Right: the Save/Share/More buttons, unchanged.
  4. Hero image: unoptimized when `https`, otherwise a 16:9 `bg-panel-muted` block. Caption and credit removed.
  5. "Bias Distribution": the meter, unchanged. The line underneath becomes `AI-estimated framing · {72% confidence}`.
  6. Body: `splitParagraphs(raw_text)`. Use the paragraph index as the key, since paragraphs may repeat.
  7. `<RelatedStories items={related} />`.
- Aside, in order:
  1. **Bias Analysis**:
     - "AI-estimated framing" in the small muted label slot.
     - The big label uses `labelClass(bias_label)`. Add the percentage only for left/center/right.
     - Below it: `{formatConfidence}`.
     - `BiasRows`, unchanged.
     - The `disclaimer` paragraph.
     - The "How We Analyze Bias" button.
  2. **Sentiment** (new card, same card classes):
     - Label in `text-[20px] font-semibold`, then `Score {formatSentimentScore}` on a −1 to 1 scale in muted 11px.
  3. **AI Summary**:
     - "Generated {formatDate(analysis.created_at)} · {readTime(summary)}".
     - The summary from `splitParagraphs` as `<p>` elements at `text-[14px] leading-[1.6]`, with `space-y-2`.
     - "AI summaries can make mistakes." and "Provide Feedback" stay.
  4. **Framing Notes** (replaces Source Breakdown):
     - Show a `list-disc` list when `framing_notes.length > 0`.
     - Otherwise show the muted "No framing notes for this article."
  5. **Loaded Terms**:
     - Pills: `inline-flex h-7 items-center rounded-full border border-line bg-panel px-2.5 text-[13px] font-medium text-ink`, in a `flex flex-wrap gap-2` container.
     - With no terms, show the muted "No loaded terms detected."
- Replace `BiasLean`, `leanClass`, `shareFill`, and `overallBias` with `labelClass(label: BiasLabel)`, an exhaustive switch with a `never` default:
  - left → `text-bias-left`
  - center → `text-muted`
  - right → `text-bias-right`
  - mixed → `text-ink`
  - unclear → `text-muted`

**`RelatedStories`** (`items: RelatedArticle[]`)

- `RelatedArticle` is `{ id, title, image_url, published_at, source_name }`, exported from `lib/supabase/types.ts` ready for section 20.
- Return `null` when `items` is empty.
- Otherwise it keeps the existing section markup:
  - Thumbnails are unoptimized, with the `https` fallback.
  - The meta line shows `source_name`.
  - The `time` shows the formatted date.
  - Read time is dropped.
  - Each title links to `/news/{id}`.

### 14. `app/error.tsx`

- `"use client"`, with props `{ error: Error & { digest?: string }; reset: () => void }`. Confirm the prop names against the installed Next.js `error.js` docs.
- Inside `<main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-16">`:
  - `h1` "We couldn't load stories right now."
  - A muted `p` "Please try again in a moment."
  - An outline `Button` "Retry" that calls `reset()`.
- No header or footer, which avoids a second failure. Never render `error.message`.

### 15. Don't change anything else

- No proxy, API route, design-system board, `BiasMeter`, `BiasRows`, `Button`, or `SiteHeader` changes beyond the `topics` import path.
- No unrelated refactors.

## Security requirements

- `SUPABASE_SERVICE_ROLE_KEY` is read only in `lib/supabase/env.ts`, which imports `server-only`. Every module that touches the client also imports `server-only`, so importing one from a Client Component fails the build.
- No `NEXT_PUBLIC_` variable carries a secret. No browser Supabase client exists.
- RLS is enabled on all six tables, with no policies. All privileges are revoked from `anon` and `authenticated`, verified with `has_table_privilege` and a live REST call using the publishable key.
- The trigger function uses `security invoker` and an empty `search_path`, and `execute` is revoked from `public`, `anon`, and `authenticated`. The schema contains no `SECURITY DEFINER` functions.
- Errors never echo env values or keys.
- Oxylabs IDs are stored as numeric-only `text`, never as JS numbers.
- `.env.local` is never printed or edited, and its values never appear in tool output.
- Pages call only the read query functions (`listArticleCards`, `getArticleDetail`). They never scrape, analyze, insert, or update.
- No wildcard `remotePatterns`. Scraped image URLs render only when they are `https:`.
- Scraped external links render only when `http(s):`, with `rel="noopener noreferrer"`. Scraped text renders as React text nodes, never with `dangerouslySetInnerHTML`.
- `getArticleDetail` rejects non-UUID ids before querying.
- `app/error.tsx` never shows error messages or digests to readers.

## Visual interpretation (UI parts)

- **Keep the approved visuals.** Grid, card frame, typography sizes (11/13/14/16/20/24/32px), the `ink`/`muted`/`line`/`panel`/`panel-muted` tokens, the bias colors, radii, and spacing all stay as they are. Only the text content of existing slots changes, plus three aside cards built from the existing card recipe (`rounded-lg border border-line bg-panel p-4`, 16px semibold heading).
- **Home empty state:** below "Top News", `mt-4 rounded-lg border border-line bg-panel p-6`:
  - A 16px semibold ink "No stories yet".
  - A 13px muted line: "Analyzed articles appear here after the next update."
  - Left-aligned. No illustration.
- **Card footer line:** 11px muted, wrapping naturally on narrow cards, with `·` separators.
- **Image fallback:** same aspect box and radius, `bg-panel-muted`, no icon.
- **Details aside on mobile:** stacks under the article in the existing order, with `gap-4` between cards.
- **Loaded-term pills:** look like `Chip` without the plus icon and aren't interactive (`span`, not `button`).
- **Responsiveness:** the existing breakpoints are unchanged (1/2/3 columns on home; the details grid becomes two columns at `lg`).

## Acceptance criteria

- `skew_news` has the six tables with the exact columns, constraints, and indexes above, and RLS is enabled on every one.
- The constraint tests in step 3 behave as specified, and no test data persists.
- `anon` and `authenticated` have no privileges on any table. A REST call with the publishable key returns no data.
- The security advisors report nothing beyond the intended "RLS enabled, no policy" notices.
- `supabase/schema.sql` reproduces the database schema exactly.
- `lib/supabase/database.types.ts` is generated from the live schema, and `lib/supabase/types.ts` exports the aliases and joined types.
- Each query function listed exists, is typed, imports `server-only`, and follows the rules above:
  - `.in()` gets at most 15 values.
  - Article inserts are append-only.
  - The pending check is LEFT JOIN-based.
- `supabase/seed.sql` exists, is separate from `schema.sql`, and has been applied. `sources` holds exactly the five approved active rows, and rerunning the seed adds nothing.
- With no articles in the database, `/` shows the header, "Top News", and the empty state. There are no demo stories, and nothing in the codebase imports `stories` or `getArticle`.
- With one analyzed article in the database:
  - `/` shows its card with the source, date, image (or fallback), meter, framing, sentiment, and confidence.
  - The card links to `/news/<uuid>`, which shows the full analysis: summary, sentiment, framing percentages, confidence, framing notes, loaded terms, and disclaimer.
- Pending articles (no analysis, or no `analyzed_at`) don't appear on `/`, and their URLs return not-found.
- `/news/not-a-uuid` and an unknown UUID render the existing not-found page. Signed-out access still redirects to sign-in.
- Related Stories doesn't render.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass. The build reports no "uncached data outside Suspense" errors.

## Checks to run

```
npm run typecheck
npm run lint
npm run build
```

Also run the MCP checks above: `list_tables`, the rollback constraint tests, the `has_table_privilege` queries, and `get_advisors` for security and performance.

## Manual test steps (after implementation)

1. In Supabase Dashboard → `skew_news` → **Table Editor**, confirm the six tables exist and each shows **RLS enabled**.
2. In **SQL Editor**, run this and confirm the transaction rolls back cleanly and returns `bias_score = 0.290`:
   ```sql
   begin;
   with s as (
     insert into sources (name, listing_url) values ('Test Source', 'https://example.com') returning id
   ), a as (
     insert into articles (source_id, original_url, title, image_url, published_at, raw_text)
     select id, 'https://example.com/2026/11/16/test-story', 'Test story', 'https://example.com/i.jpg', now(), 'Body'
     from s returning id
   )
   insert into article_analyses (article_id, summary, sentiment_score, sentiment_label, bias_label,
     left_percentage, center_percentage, right_percentage, confidence, disclaimer, model)
   select id, 'Summary', 0, 'neutral', 'center', 20, 31, 49, 0.6, 'AI-estimated.', 'test'
   from a returning bias_score;
   rollback;
   ```
3. Run `select name, listing_url, is_active from sources order by name;` and confirm the five seeded sources, all active (BBC News, Fox News, NPR, Reuters, The Guardian). Paste `supabase/seed.sql` into the SQL Editor again and confirm it reports `0` rows inserted.
4. Run `npm run dev` and open `http://localhost:3000`. You'll see "Top News" with the "No stories yet" empty state.
5. To preview a populated feed before scraping exists, insert one sample source, article, and analysis. Run step 2's SQL **without** `begin`/`rollback`, then add `update articles set analyzed_at = now();`. Reload `/` and confirm the card renders. Click it, sign in if prompted, and confirm the details page shows every analysis section with no Related Stories.
6. Open `http://localhost:3000/news/not-a-uuid` and confirm the not-found page.
7. Clean up the sample data. The cascade removes the article and its analysis:
   ```sql
   delete from articles where original_url = 'https://example.com/2026/11/16/test-story';
   delete from sources where name = 'Test Source';
   ```
