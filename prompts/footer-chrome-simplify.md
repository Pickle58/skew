# Footer chrome simplify

## Goal

Remove non-functional Company, Help, and Connect columns from `SiteFooter`. Keep inverse Wordmark, tagline, and copyright.

## Skills read

- Impeccable distill (Operate): strip dead link/social chrome; keep Skew ink footer brand commitments.

## Existing code inspected

- `components/home/site-footer.tsx` — 4-column grid with brand + Company/Help/Connect.
- Call sites already use `<SiteFooter />` unchanged: `app/page.tsx`, `components/article/article-page.tsx`, `app/news/[id]/not-found.tsx`.

## Decisions / assumptions

- Keep tagline “Balanced news coverage, powered by AI.” and “© 2026 Skew News. All rights reserved.”
- Single stacked layout after removal (no empty columns).
- Out of scope: design-system board, newsletter, Provide Feedback.

## Files likely to change

- `components/home/site-footer.tsx`

## Implementation requirements

1. Delete company/help link arrays, FooterLink, SocialButton, social icons.
2. Remove Company / Help / Connect markup.
3. Drop multi-column grid; brand block + copyright border-t.
4. Keep `bg-ink`, `text-footer-muted`, `max-w-[1280px]`, padding.

## Security requirements

- Static UI only; no new secrets or client pipeline calls.

## Acceptance criteria

- No Company / Help / Connect or social icons.
- Wordmark, tagline, copyright remain.
- Typecheck and lint pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `impeccable detect --json components/home/site-footer.tsx`

## Exact manual test steps

1. Open home — footer shows only brand lockup, tagline, copyright.
2. Open an article page — same footer.
