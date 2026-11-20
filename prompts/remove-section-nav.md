# Remove For You, Local, and Blindspot

## Goal

Remove the unused "For You", "Local", and "Blindspot" section labels from the site header. Keep "Home". These controls do not navigate or filter content.

## Skills read

- None required (UI-only removal; no Clerk, Supabase, Oxylabs, or AI SDK changes)

## Existing code inspected

- `components/home/site-header.tsx` — `navItems` is `["Home", "For You", "Local", "Blindspot"]`. `NavItems` renders them as buttons. Desktop shows them at `md` and up. The mobile `#section-menu` shows the same list when the menu is open.
- Used by `app/page.tsx`, `components/article/article-page.tsx`, and `app/news/[id]/not-found.tsx` through `SiteHeader`.
- No other component, route, or API uses these labels.

## Decisions or assumptions

- Keep the "Home" label and `aria-current="page"` on it.
- Keep `NavItems`, the menu button, and the mobile menu. The menu still shows Home and the auth control.
- Do not change topics, utility bar, Subscribe, Login, or wordmark.
- Do not edit historical prompt notes that mention the old labels.

## Visual interpretation

- Desktop header: wordmark, then "Home" only, then Subscribe and auth. The 20px gap row no longer includes For You, Local, or Blindspot.
- Mobile: the opened section menu lists Home only, then the auth control.
- Typography, color, and spacing of the remaining Home control stay as they are: 14px medium, ink, hover `text-bias-right`.

## Files likely to change

- `prompts/remove-section-nav.md` (this file)
- `components/home/site-header.tsx`

## Implementation requirements

1. Change `navItems` to `["Home"]`.
2. Leave `NavItems` rendering and `aria-current` logic in place.

## Security requirements

- No secrets or server boundaries change
- Do not introduce client exposure of server-only env vars

## Acceptance criteria

- Header shows Home and does not show For You, Local, or Blindspot on desktop or in the mobile menu
- Home still has `aria-current="page"`
- Subscribe, Login / UserButton, topics, and the rest of the header are unchanged
- No remaining `"For You"`, `"Local"`, or `"Blindspot"` in `components/`, `app/`, or `lib/`

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps

1. Start the app with `npm run dev` if it is not already running.
2. Open the home page at desktop width. Confirm the header shows Home and does not show For You, Local, or Blindspot.
3. Narrow the window below 768px, open the menu, and confirm the same: Home only.
4. Open a news details page and confirm the header matches.
