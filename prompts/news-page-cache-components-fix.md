# Fix news details infinite recompile loop (Cache Components)

## Goal

Stop the `/news/[id]` dev-server recompile/refetch loop caused by Cache Components rejecting uncached data in `generateMetadata`, and align the news page with the home page’s `connection()` + Suspense pattern.

## Skills / docs read

- `node_modules/next/dist/docs/` — Cache Components, `generateMetadata`, `connection()`, `blocking-prerender-metadata-dynamic`
- Existing home pattern: `components/home/news-feed.tsx` (`await connection()` inside Suspense)

## Existing code inspected

- `app/news/[id]/page.tsx` — `generateMetadata` and page both call `getArticleDetail` (Supabase) with no `"use cache"`; page calls `auth.protect()` with no `connection()`
- `app/news/[id]/loading.tsx` — segment loading UI (Suspense boundary for the page)
- `components/home/news-feed.tsx` — correct Cache Components pattern
- `next.config.ts` — `cacheComponents: true`, `partialPrefetching: true`
- Dev terminal — repeating `✓ Compiled` + `GET /news/<id> 200`, plus:

  > Route "/news/[id]": Next.js encountered uncached data in `generateMetadata()`.

## Decisions or assumptions

1. Root cause is Cache Components + dynamic Supabase access in `generateMetadata` without an explicit cache/dynamic choice. That error triggers Turbopack HMR → browser refresh → repeat.
2. Prefer the same pattern as the home feed: `await connection()` inside the dynamic page body (covered by `loading.tsx` Suspense), and `"use cache"` on `generateMetadata` for the article title fetch (external data keyed by `id`).
3. Keep `auth.protect()`, related-articles fetch, and UI unchanged aside from the Cache Components boundary fix.
4. Do not disable `cacheComponents` / `partialPrefetching`.
5. Do not change PostHog / `agentFeedback` for this fix (they are not the root cause of the news-page loop).

## Files likely to change

| File | Change |
| ---- | ------ |
| `app/news/[id]/page.tsx` | `"use cache"` in `generateMetadata`; `await connection()` before auth/data; optional small Suspense split if needed to match docs |

## Implementation requirements

1. In `generateMetadata`, add `'use cache'` before fetching the article title via `getArticleDetail`.
2. In the page (or a child async component wrapped by Suspense / covered by `loading.tsx`), call `await connection()` before `auth.protect()` and DB reads.
3. Preserve related-articles behavior: strip `embedding` before passing analysis to `ArticlePage`.
4. Do not scrape/analyze from the UI. Do not expose secrets.

## Security requirements

- `auth.protect()` remains required for the news details page.
- No client-side Supabase service role or pipeline calls.

## Acceptance criteria

- Opening `/news/<id>` while signed in does **not** spam `✓ Compiled` + repeated GETs in the dev terminal.
- The `blocking-prerender-metadata-dynamic` / uncached `generateMetadata` error no longer appears.
- News details still render title, analysis, and related stories.
- `npm run typecheck` and `npm run lint` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- Manual: `pnpm dev`, open a news details URL signed-in, watch terminal for ~15s — expect one (or few) GETs, no compile loop.

## Exact manual test steps

1. Ensure `pnpm dev` is running.
2. Sign in and open `/news/6f29139b-cf33-4fa7-9db9-73a932e1f053` (or any analyzed article).
3. Watch the Next.js terminal for 15 seconds.
4. Confirm no repeating `✓ Compiled` / GET storm and no metadata Cache Components error.
5. Confirm the article page still shows analysis + related stories when embeddings exist.
