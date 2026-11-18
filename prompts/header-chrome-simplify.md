# Header chrome simplify

## Goal

Distill `SiteHeader` to Logo, Home, and User/Login only. Remove utility bar, unused nav, Subscribe, and topics. Keep the hamburger on small viewports with Home + Auth in the panel.

## Skills read

- Impeccable distill (Operate mode): strip non-product chrome; keep Skew tokens/Wordmark/Clerk.

## Existing code inspected

- `components/home/site-header.tsx` — full chrome including utility row, four nav items, Subscribe, hamburger, topics.
- Call sites: `app/page.tsx`, `components/article/article-page.tsx`, `app/news/[id]/not-found.tsx`.
- `components/home/topics.ts` — only imported by site-header.
- `components/ui/chip.tsx` — still used by design-system board; keep.

## Decisions / assumptions

- Desktop: Logo · Home · Auth in one row.
- Mobile: hamburger (`md:hidden`) opens Home + AuthControl; Auth stays out of the main mobile row (`hidden md:contents` pattern).
- No `showTopics` prop after this change.
- Footer / newsletter / Save-Share out of scope.

## Files likely to change

- `components/home/site-header.tsx`
- `components/article/article-page.tsx`
- `app/news/[id]/not-found.tsx`
- Delete `components/home/topics.ts`

## Implementation requirements

1. Remove utility bar, For You / Local / Blindspot, Subscribe, topics row, `showTopics`.
2. Keep Logo link to `/`, Home link to `/`, AuthControl, hamburger + menu panel (Home + Auth only).
3. Clean unused imports; keep `Menu`.
4. Drop `showTopics={false}` at call sites.

## Security requirements

- No secrets in browser; auth stays Clerk client components only.

## Acceptance criteria

- No utility bar, topics, Subscribe, or dead section links.
- Logo and Home go to `/`.
- Login / UserButton work; hamburger on small viewports opens Home + Auth.
- Typecheck and lint pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps

1. Home desktop: only Logo, Home, Login|avatar.
2. Narrow viewport: hamburger opens Home + Login|avatar; logo still home.
3. Article page header matches (no topics prop).
