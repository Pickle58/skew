# Header auth on the right

## Goal

Keep the Clerk Login / UserButton on the right side of the site header on desktop.

## Skills read

- None required (UI-only layout fix)

## Existing code inspected

- `components/home/site-header.tsx` — after the dead-header strip, AuthControl is wrapped in `span` with `ml-auto hidden md:contents`. `display: contents` drops the wrapper box, so `ml-auto` does not push Login / UserButton to the right.

## Decisions or assumptions

- Keep Home on the left with the wordmark.
- Keep Login in the mobile menu only below 768px.
- Use a real flex child for desktop auth so `ml-auto` works.

## Files likely to change

- `prompts/header-auth-right.md` (this file)
- `components/home/site-header.tsx`

## Implementation requirements

1. Replace the `md:contents` auth wrapper with a flex child that stays in the layout, e.g. `ml-auto hidden md:flex` around `AuthControl`.
2. Do not change mobile menu auth placement.

## Security requirements

- No secrets or server boundaries change

## Acceptance criteria

- On desktop, Login or UserButton sits on the right side of the header row
- On mobile, auth still appears only in the opened menu
- Home, wordmark, and topics are unchanged

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps

1. Open the home page at desktop width. Confirm Login or the account button is on the right of the header.
2. Narrow below 768px, open the menu, and confirm Login is still in the menu.
