# pgvector embeddings and related articles

## Goal

Implement AGENTS.md **section 20**:

1. Enable the `vector` extension (pgvector) on the Supabase project.
2. Add `embedding vector(1536)` to `article_analyses` and an IVFFlat cosine index.
3. Extend `POST /api/analyze` so each new analysis also stores a `text-embedding-3-small` embedding, and existing analysis rows with a null embedding are backfilled without a second analysis call.
4. Set `articles.analyzed_at` only after both the analysis row and the embedding are saved.
5. Add `getRelatedArticles(articleId, embedding)` and show up to 5 similar articles on the news details page. Hide that section when the current article has no embedding.

UI keeps reading stored data only. No scraping, no new routes, no scheduler or cron work.

## Skills read

- `.agents/skills/supabase/SKILL.md`
  - Changelog index (`https://supabase.com/changelog.md`, scanned 2026-11-17): no breaking change for the `vector` Postgres extension or supabase-js vector columns. The 2026-05-18 “vector opt-in” item is the self-hosted logs stack, not pgvector.
  - Current docs ([pgvector](https://supabase.com/docs/guides/database/extensions/pgvector), [semantic search](https://supabase.com/docs/guides/ai/semantic-search), [IVFFlat](https://supabase.com/docs/guides/ai/vector-indexes/ivf-indexes)):
    - Enable with `create extension vector with schema extensions`.
    - Column type is `extensions.vector(1536)`.
    - Cosine distance operator is `<=>`; cosine index opclass is `vector_cosine_ops`.
    - supabase-js cannot order a joined select by `<=>`. The documented path is a SQL function called with `.rpc()`.
    - IVFFlat `lists` must not exceed the number of indexed rows, and the index should be built once rows exist. Supabase now recommends HNSW for new apps. This task still uses IVFFlat because section 20 requires it.
  - Security: `SECURITY INVOKER` (not definer). Revoke `EXECUTE` from `public`, `anon`, and `authenticated`. Grant `EXECUTE` to `service_role` only. Do not expose the embedding column to browser code. RLS stays enabled with no policies; service role bypasses RLS.
  - Schema workflow: this repo has `supabase/schema.sql` and no `supabase/schemas/` declarative path. Apply SQL with MCP `execute_sql` (not `apply_migration`), then mirror the same SQL in `supabase/schema.sql`.
- `.agents/skills/ai-sdk/SKILL.md` and installed packages (`ai@7.0.173`, `@ai-sdk/openai@4.0.118`):
  - `embed` from `ai`; model via `openai.embedding('text-embedding-3-small')` (`EmbeddingModelV4` on this install).
  - Default dimensions for `text-embedding-3-small` are 1536. Do not pass a custom `dimensions` value.
  - Result field is `embedding: number[]`.
- `node_modules/next/dist/docs/` is not required for new routing. The details page is an existing async Server Component.

## Existing code inspected

- `lib/ai/analyze-article.ts` — `generateText` + `Output.object`, one retry, returns an insert payload without `article_id`. Model constant is `ANALYSIS_MODEL` in `lib/limits.ts`.
- `lib/pipeline/analyze.ts` — batches pending articles, inserts analysis, then `markArticleAnalyzed`. A unique violation on insert counts as skipped. `analyzed_at` is set only after a successful insert.
- `lib/supabase/queries/articles.ts` — `listPendingAnalysisArticles` is a left join where `article_analyses` is null. That does **not** return rows that already have analysis and a null embedding. `getArticleDetail` selects `article_analyses!inner(*)`.
- `lib/supabase/queries/analyses.ts` — `insertArticleAnalysis` only.
- `lib/supabase/types.ts` — `RelatedArticle` is `{ id, title, image_url, published_at, source_name }`. `ArticleAnalysisInsert` omits generated `bias_score`.
- `lib/supabase/database.types.ts` — `article_analyses` has no `embedding`. `Functions` is empty.
- `supabase/schema.sql` — `article_analyses` has no vector column. RLS is on; `anon` and `authenticated` are revoked.
- `app/news/[id]/page.tsx` — passes `related={[]}` into `ArticlePage`.
- `components/article/related-stories.tsx` — already renders the section and returns `null` when `items` is empty. Heading is **Related Stories**. `components/article/article-page.tsx` already mounts it under the body.
- `components/home/site-header.tsx` and `components/article/newsletter-form.tsx` are client components. `ArticlePage` does not pass the analysis object into them.

## Decisions

- **Reuse Related Stories.** Do not add a second section or change layout, type, or spacing. Populating `related` is the section 20 UI. The visible heading stays “Related Stories”.
- **Embedding text** is `Title: ${title}\n\n${rawText}` truncated with the existing `ANALYSIS_TEXT_CHAR_LIMIT` (12_000). Same text for first analysis and backfill.
- **New articles:** run analysis and `embed` together. Insert one `article_analyses` row that includes `embedding`. Call `markArticleAnalyzed` only after that insert succeeds. If either model call fails, insert nothing and count the article failed (existing retry-once behavior stays on the analysis call; embedding gets one retry the same way).
- **Backfill:** a row with analysis and `embedding is null` is embedded only. Do not call the analysis model again. Update `embedding`. If `analyzed_at` is already set, leave it. If it is null, set it after the embedding update succeeds.
- **Pending selection:** keep the current “no analysis row” query. Add a second query for analyses whose `embedding` is null, joined to `articles` for title and `raw_text`. The pipeline fills a batch with unanalyzed articles first, then backfill rows, and still honors `limit`, `articleIds`, and `excludeIds`. Do not filter with `.eq('foreignTable.column', ...)`.
- **Similarity query:** SQL function `public.match_related_articles(query_embedding extensions.vector(1536), exclude_article_id uuid, match_count integer)`:
  - `language sql`, `stable`, `security invoker`, `search_path = public, extensions`.
  - Join `article_analyses` → `articles` → `sources`.
  - Keep rows where `embedding is not null`, `articles.analyzed_at is not null`, and `articles.id <> exclude_article_id`.
  - `order by embedding <=> query_embedding`.
  - `limit least(match_count, 5)`.
  - Returns `id`, `title`, `image_url`, `published_at`, `source_name`.
  - Revoke execute from `public`, `anon`, `authenticated`. Grant execute to `service_role` only.
- **`getRelatedArticles`** lives in `lib/supabase/queries/articles.ts`, uses `getSupabaseAdmin().rpc(...)`, and returns `[]` for a missing or wrong-sized embedding. It does not return distances or vectors.
- **IVFFlat:** `article_analyses_embedding_idx` on `embedding` using `ivfflat (embedding vector_cosine_ops) with (lists = 1)`. `lists = 1` is the only value that is valid for a small article table (pgvector requires `lists` ≤ row count). Create the index when `article_analyses` has at least one row. If the table is empty at apply time, keep the `create index` statement in `schema.sql` and run it as soon as a row exists in this same implementation; if it still cannot be created, stop and say so rather than switching to HNSW.
- **Types:** add `embedding: string | null` on the `article_analyses` Row/Insert/Update in `database.types.ts` (pgvector values travel as text). Full inserts pass the vector as the pgvector literal string `` `[${embedding.join(",")}]` ``. Add the RPC to `Database["public"]["Functions"]`. `ArticleAnalysisInsert` includes `embedding`. Do not add the vector to card selects.
- **Details query:** stop using `article_analyses!inner(*)` in `getArticleDetail` if that would ship the vector into the `ArticlePage` props. Select the existing analysis columns plus `embedding` on the server, call `getRelatedArticles` only when `embedding` is non-null, and pass `ArticlePage` an analysis object **without** `embedding`.
- **Logging:** do not log vectors, raw article text, or API keys. Extend the existing analyze summary only if a count is already implied (`analyzed` covers both full saves and embedding backfills). A backfill success counts as `analyzed`. A backfill failure counts as `failed` and leaves the null embedding for the next run.
- **Constants** in `lib/limits.ts`: `EMBEDDING_MODEL = "text-embedding-3-small"`, `EMBEDDING_DIMENSIONS = 1536`, `RELATED_ARTICLE_LIMIT = 5`.

## Files likely to change

- `supabase/schema.sql`
- `lib/supabase/database.types.ts`
- `lib/supabase/types.ts` (only if the insert type needs an explicit embedding field)
- `lib/limits.ts`
- `lib/ai/analyze-article.ts` or a new `lib/ai/embed-article.ts` (one small server-only embed helper)
- `lib/supabase/queries/analyses.ts` (update embedding)
- `lib/supabase/queries/articles.ts` (`getRelatedArticles`, missing-embedding list, detail select)
- `lib/pipeline/analyze.ts`
- `app/news/[id]/page.tsx`

No change to `components/article/related-stories.tsx` unless a type import requires it. No `.env` changes (`OPENAI_API_KEY` already covers embeddings).

## Implementation requirements

1. Inspect the live project with Supabase MCP (`list_projects`, `list_extensions`, `execute_sql` for `article_analyses` columns and row count) before writing SQL.
2. Run, in order:
   - `create extension if not exists vector with schema extensions;`
   - `alter table public.article_analyses add column if not exists embedding extensions.vector(1536);`
   - create `match_related_articles` and the execute grants/revokes
   - create the IVFFlat index when the table has at least one row
3. Copy that SQL into `supabase/schema.sql` next to `article_analyses` (extension statement near the top of the file).
4. Generate the embedding with `embed` from `ai` and `createOpenAI({ apiKey: getOpenAIApiKey() }).embedding(EMBEDDING_MODEL)`. Reject a vector whose length is not 1536.
5. Save the embedding on insert for new analyses and via update for backfill.
6. `getRelatedArticles(articleId, embedding)` enforces the UUID shape already used in this file, calls the RPC, and maps rows to `RelatedArticle`.
7. News details page: load related articles only when the current analysis has an embedding; otherwise pass `[]` so `RelatedStories` renders nothing.

## Security requirements

- Service role and OpenAI key stay in server modules (`import "server-only"`).
- The match function is invoker and not executable by `anon` or `authenticated`.
- Embeddings are not selected into client component props, logs, or API responses. `POST /api/analyze` keeps the existing admin-secret header and does not return vectors.
- No `SECURITY DEFINER`. No new RLS policies. No grant of table access to `anon` or `authenticated`.

## Acceptance criteria

- `vector` is enabled in schema `extensions`.
- `article_analyses.embedding` is `extensions.vector(1536)` and nullable.
- IVFFlat cosine index exists, or the implementation stops with the exact Postgres error if an empty table blocks it.
- `match_related_articles` is not executable by `anon` / `authenticated`.
- A full analyze run stores an embedding and sets `analyzed_at` only after that save.
- An analysis row with a null embedding is backfilled by a later analyze run without a second framing call.
- Details page shows up to 5 other analyzed articles ordered by cosine distance, using the existing Related Stories block.
- The section is absent when the open article has no embedding.
- The current article is not listed in its own related set.
- Homepage cards are unchanged.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (server query and page data flow changed)
- After SQL is applied, `execute_sql` to confirm the extension, column, index, and that `has_function_privilege('anon', 'public.match_related_articles(extensions.vector, uuid, integer)', 'execute')` is false.

## Manual test steps

1. Start `npm run dev` and watch that terminal.
2. Backfill embeddings (and any still-pending analyses) with:

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "content-type: application/json" \
  -H "x-skew-admin-secret: $SKEW_ADMIN_SECRET" \
  -d "{}"
```

Use the value from `.env.local`. Do not print the secret. Expect console lines for each article and a final `[analyze] summary` with `analyzed` > 0 when any row needed an embedding.

3. In the Supabase SQL editor or MCP, confirm new rows have `embedding is not null` and `analyzed_at is not null`. Confirm one row’s `vector_dims(embedding) = 1536`.
4. Sign in and open `/news/<id>` for an article that has an embedding. Related Stories shows up to 5 other stories (image, source, title, date). Each link opens `/news/<that id>`.
5. Open a story and confirm it is not linked in its own Related Stories list.
6. If any analyzed article still has a null embedding, the section is absent on that story. After another `POST /api/analyze`, reload and confirm the section appears.
7. Confirm the home page still lists cards and does not show an embedding or a related-stories block.
