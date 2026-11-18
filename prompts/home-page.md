# Skew home page

## Goal

Replace the design-system board on `/` with the Skew news home page from the attached reference. Match that page’s layout, type, color, spacing, controls, and copy. Do not redesign it.

Reference image: `C:\Users\jpilk\.cursor\projects\c-Users-jpilk-Documents-Projects-skew\assets\02-homepage-57d960fb-72f8-4715-9e5c-ceaba02bf30f.jpg`

The reference file is 683×1024. It is a desktop composition shown small, not a mobile layout. Build the desktop reading of that sheet, then adapt it down.

This session is code-led. The attached home page is the composition to match. The established Skew world in `DESIGN.md` stays: Poppins, sheet gray, white hairline cards, pill controls, and the red / hairline / blue bias bar. The home page is a new surface in that world, not a new visual identity.

## Skills read

- `.cursor/skills/impeccable/SKILL.md` and `reference/new-work.md`. `impeccable context --target app/page.tsx` was run. The attached home page pins the composition, so no concept-seed round.
- `PRODUCT.md` and `DESIGN.md`.
- `.impeccable/surfaces/app-page-tsx.md` — the current brief still describes the design-system sheet. Replace that contract before writing the page (see Implementation requirements).
- Next.js App Router patterns already in `app/layout.tsx` and `app/page.tsx`. `node_modules/next/dist/docs/` is empty in this install. Follow the installed `LayoutProps` and `next/font/google` usage. Do not guess a different font or routing API.

Project skills for Clerk, Supabase, Oxylabs, and the AI SDK do not apply. This page does not authenticate, query Supabase, scrape, or analyze.

## Existing code inspected

- `app/page.tsx` — renders `DesignSystemBoard` only.
- `app/layout.tsx` — Poppins 400–800, metadata title `Skew`, body `bg-surface font-sans text-ink`.
- `app/globals.css` — Tailwind v4 tokens for ink, muted, surface, panel, panel-muted, line, bias-left, bias-right, footer-muted, diagram, shadows, and radii.
- `components/brand/wordmark.tsx` — `tone` `default | inverse`, `size` `brand | footer`. Brand is 40px “Skew” plus 14px “News”. Footer is 22px / 11px.
- `components/ui/button.tsx` — `primary | secondary | text`, `solid | outline`, 28px tall, 13px medium. Primary solid is ink. Primary outline is white with an ink border. Secondary solid hovers to `panel-muted`.
- `components/ui/chip.tsx` — 28px white pill, hairline, trailing 12px plus.
- `components/ui/bias-meter.tsx` — flex segments, labels `Left n%` / `Center n%` / `Right n%`, sizes `meter` (32px) and `card` (24px).
- `components/design-system/board.tsx` — the current `/` document. Keep the component. Stop rendering it on `/`.
- `package.json` — Next 16.4.6, React 19.3.0, Tailwind 4.3.3, `lucide-react`. Scripts are `dev`, `build`, `start`, `lint`. No `typecheck` script. Package manager is pnpm.
- No `lib/` directory, no article queries, no auth, no details route.

## Decisions or assumptions

- `/` becomes the news home. Move the design-system board to `/design-system` so the approved sheet stays reachable. Do not restyle the board.
- Story copy, percentages, source counts, places, and the date are reference content taken from the attached page. The app has no article catalog. Do not call Supabase, invent extra stories, or add sentiment, confidence, author, or read-time fields the reference does not show.
- The product name is Skew. Render the wordmark as Skew, and the copyright line as “© 2026 Skew News. All rights reserved.” The tagline keeps the product comma: “Balanced news coverage, powered by AI.”
- The date line is the reference date, static: “Monday, June 1, 2026”. Do not use the machine date.
- Header Subscribe and Login, the theme words, Set Location, International Edition, topic chips, the info pips, and footer links are visible controls. They do not navigate, open menus, change theme, or call an API. Home is the current page. There is no dark theme; Light stays the indicated theme.
- Photographs are crops of the twelve card images in the reference, saved under `public/home/`. Do not generate new portraits, fetch news-site images, or hotlink remote URLs.
- Cards are not links. There is no details route in this pass.
- Lucide supplies UI icons (menu, plus, chevron, info). Lucide does not ship brand marks, so the four footer social marks are small inline SVGs: X, LinkedIn, Facebook, YouTube. Do not add an icon package.
- Before saving the story list, compare every bias label and source count to the reference and correct any misread digit. The numbers below are the working transcription. Two rows may not sum to 100 in that transcription (SpaceX, Real Madrid); the reference wins.

## Files likely to change

- `.impeccable/surfaces/app-page-tsx.md` — direction contract for the news home.
- `app/page.tsx` — compose the home page.
- `app/design-system/page.tsx` — render `DesignSystemBoard`.
- `components/home/stories.ts` — typed reference stories.
- `components/home/site-header.tsx` — utility bar, header, topic rail. Client only if the rail scroll or the narrow menu needs it.
- `components/home/news-card.tsx`
- `components/home/site-footer.tsx`
- `components/ui/bias-meter.tsx` — add a compact label mode the home cards use (`L n%`, `Center n%`, `Right n%`) without changing the design-system meter copy.
- `components/ui/button.tsx` — add a header size (about 36px tall, 14px horizontal padding) used by Subscribe and Login. The 28px size stays the default so the design-system matrix does not grow.
- `components/brand/wordmark.tsx` — add a header size, about 22px “Skew” and 11px “News”, if `footer` is not already the header scale. Do not change the 40px brand size.
- `public/home/*.jpg` — twelve crops from the reference.
- A one-off crop script may be added and then removed. Do not leave a runtime image dependency.

Do not edit `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, or this prompt while implementing.

## Visual interpretation

The page sits on `#F6F6F6`. Content is a centered 1280px column with 24px side margin. The header is on the same gray ground, not a white bar. Cards are white, 12px radius, 1px `#E5E7EB`, flat. The footer is a full-bleed `#00000F` band, square corners, flush to the viewport, unlike the inset rounded footer on the design-system sheet.

Desktop order:

1. Utility bar.
2. Header.
3. Topic rail.
4. “Top News” and a 3-column card grid, four rows, twelve cards, reading left to right.
5. Footer.

### Utility bar

One line, caption size (11px), secondary `#68728D`, split to the two edges of the column.

Left: “Browser Extension”.

Right, in one group: “Theme:” then “Light”, “Dark”, “Auto”; then “Monday, June 1, 2026”; then a small pin icon and “Set Location”; then a globe icon and “International Edition” with a chevron. Light is the indicated theme (ink, medium). Dark and Auto stay secondary. Icons are Lucide, about 12px, stroke 2.

### Header

A row under the utility bar, aligned to the same column.

- Left: Lucide `Menu`, 20px, ink, then the header wordmark (Skew extrabold, News in muted beside it).
- Then the nav: “Home”, “For You”, “Local”, “Blindspot”. 14px medium. Home is ink. The others are ink at rest. Gaps about 20px. Home has `aria-current="page"`.
- Right: Subscribe as primary solid at the header size, label “Subscribe”. Login as primary outline at the header size, label “Login”.

### Topic rail

A horizontal row of the existing chips, white pills, hairline, 13px medium, trailing plus. Order:

1. World Cup
2. IPL
3. Social Media
4. Business & Markets
5. Health & Medicine
6. Soccer
7. Artificial Intelligence
8. Arsenal FC
9. Extreme Weather and Disasters

A leading plus-only round control sits at the start of the row. A chevron at the end scrolls the row toward the clipped chips. The row does not wrap on desktop. Overflow is clipped, not a page-level scrollbar. The chevron is a button with an accessible name.

### Top News

Section title “Top News”, 24px semibold, ink, line-height 1.3, left aligned with the grid, about 16px above the cards.

### News card

White card, 12px radius, 1px hairline, no resting shadow. Padding about 12px. The photograph is full width of the inner padding, about 16:10, 12px radius, `object-cover`. A 20px white info pip with the small shadow and a Lucide `Info` icon sits at the photograph’s top-right, inset about 8px. The pip is a button named “About this estimate”.

Under the photo, stacked:

- Eyebrow, 11px, muted: “{topic} · {place}”.
- Title, 16px semibold, ink, line-height 1.35, two or three lines as the reference needs. This home card title is tighter than the design-system specimen’s 20px title because the reference grid sets twelve headlines in a compact card. Do not change the design-system specimen.
- Bias bar, about 22px tall, full pill. Left segment `#B42318` with white “L {n}%”. Center `#E5E7EB` with ink “Center {n}%”. Right `#1D4ED8` with white “Right {n}%”. Labels are 10px medium and do not wrap. No 0–100 scale.
- “{count} sources”, 11px, muted, under the bar.

### Stories

Use these rows after checking them against the reference. `src` is the cropped file.

| id | topic | place | title | left | center | right | sources | file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| trump-iran | Politics | United States | Trump Sends Iran Revised Peace Proposal With Tougher Terms: Report | 20 | 31 | 49 | 12 | trump-iran.jpg |
| grapes | Health | United States | Researchers Make Case for Grapes as a ‘Superfood’ After Review of Health Evidence | 18 | 42 | 40 | 7 | grapes.jpg |
| cern | Science | Switzerland | CERN Finds High-Significance Hint of Physics Beyond Standard Model | 16 | 62 | 22 | 8 | cern.jpg |
| rivera | World | Nicaragua | Indigenous Leader Brooklyn Rivera Dies in Nicaragua After Nearly 3 Years of Detention | 54 | 28 | 18 | 63 | rivera.jpg |
| unsc | World | Middle East | UN Security Council to Hold Emergency Meeting as Israel Pushes Deeper into Lebanon | 22 | 35 | 43 | 15 | unsc.jpg |
| oil | Business | Global | Oil Prices Dip as OPEC+ Considers Output Increase Amid Weak Demand | 25 | 50 | 25 | 11 | oil.jpg |
| starship | Technology | United States | SpaceX Launches Starship Test Flight in Milestone for Mars Program | 12 | 48 | 45 | 9 | starship.jpg |
| apple | Business | United States | Apple Unveils AI-Powered Features Across iPhone, iPad and Mac | 15 | 40 | 45 | 10 | apple.jpg |
| climate | Climate | Global | 2025 on Track to Be Among Top 3 Hottest Years, EU Climate Service Says | 33 | 34 | 33 | 14 | climate.jpg |
| fed | Economy | United States | Fed Holds Rates Steady, Signals Caution on Inflation and Growth Outlook | 30 | 45 | 25 | 13 | fed.jpg |
| madrid | Soccer | Europe | Real Madrid Win Champions League After Comeback Victory in Final | 5 | 20 | 70 | 26 | madrid.jpg |
| wildfires | Environment | Canada | Wildfires Force Thousands to Evacuate Across Western Canada | 27 | 33 | 40 | 17 | wildfires.jpg |

Image alt text is the story title.

### Footer

Full-bleed ink band. Inside the same 1280px column, padding about 40px vertical and 24px horizontal. Four groups on desktop:

- Lockup: inverse wordmark at footer size, then the tagline in footer gray, 13px, max width about 220px: “Balanced news coverage, powered by AI.”
- Company: caption heading “Company” in a lighter gray, then About, Careers, Press, Contact.
- Help: heading “Help”, then Help Center, Guides, Privacy Policy, Terms of Service.
- Connect: heading “Connect”, then four icon buttons in a row: X, LinkedIn, Facebook, YouTube. Icon color is white. Each button has an accessible name.

Link text is 13px, footer gray. Headings are 12px medium, slightly brighter than the links.

A hairline in a dark gray separates the copyright row. Left: “© 2026 Skew News. All rights reserved.” 12px, footer gray.

## Layout, spacing, color, type

Use the tokens already in `app/globals.css`. Do not add a second palette.

| Token | Value | Use on this page |
| --- | --- | --- |
| surface | `#F6F6F6` | Page ground, including behind the header |
| panel | `#FFFFFF` | Cards, chips, Login, info pip |
| ink | `#00000F` | Titles, nav, Subscribe, footer ground |
| muted | `#68728D` | Utility bar, eyebrows, source counts, unselected theme words |
| line | `#E5E7EB` | Card border, chip border, center bias segment |
| bias-left | `#B42318` | Left segment |
| bias-right | `#1D4ED8` | Right segment, focus ring |
| footer-muted | `#C8CDD8` | Footer tagline, links, copyright |
| shadow-sm | `0 1px 2px rgb(0 0 0 / 0.05)` | Info pip only |
| radius-lg | 12px | Cards and photographs |
| radius-full | 9999px | Buttons, chips, bias bar, info pip |

Type stays Poppins. Utility and meta are caption (11px). Nav and card titles are 14px and 16px medium/semibold. “Top News” is the 24px semibold title step. Do not load another face.

## Responsiveness

At 1280px and wider, the page matches the reference: utility bar on one line, header on one line, one-line topic rail, three equal card columns, four footer groups in a row.

From 768px to 1279px, cards go to two columns. The topic rail still scrolls. Footer groups wrap to two rows. Utility meta may wrap under the left label.

Below 768px, cards are one column. Hide “For You”, “Local”, and “Blindspot” until the menu button opens them under the header. Subscribe and Login stay visible if they fit; if they collide with the wordmark, keep Subscribe and move Login into the opened menu. The topic rail scrolls. Footer groups stack. Body text stays at least 13px. The page itself does not scroll sideways.

Check 1440px and 390px.

## Pixel-perfect expectations

On a 1440px-wide viewport the first screen should read as the reference: gray ground, utility line, Skew header with Home / For You / Local / Blindspot, Subscribe and Login, the topic pills, “Top News”, and the first row of three cards with photographs, eyebrows, bias bars, and source counts. A reviewer comparing the reference and the page should not find a different typeface, a different bias palette, a missing card, or rewritten headlines.

Acceptable variance: softness from cropping a 683px-wide reference, subpixel rounding, and Lucide’s menu/info glyphs versus the reference icons. Not acceptable: a design-system board on `/`, a dark theme, remote news images, or a restyled interpretation of the grid.

## Implementation requirements

- TypeScript, no `any`. Imports at the top of each module.
- Server Components by default. Add `"use client"` only on the piece that scrolls the topic rail or toggles the narrow menu.
- Story data is a typed const in `components/home/stories.ts`. The page maps it. Do not fetch.
- `BiasMeter` gains an optional label style for the home cards. The design-system board still renders “Left 25%”, “Center 50%”, and “Right 25%” on the specimen, and “Left 25%”, “Center 50%”, “Right 49%” on its card.
- Header buttons use the existing `Button` variants. Do not duplicate a second button component.
- Crop the twelve photographs from the reference before building the cards. Keep each crop on that card’s picture only.
- Metadata stays title `Skew` and description `Balanced news coverage, powered by AI.`
- Update `.impeccable/surfaces/app-page-tsx.md` before the page code. Keep the six contract blocks and a seed line. Suggested contract:

  - Mode: Read. Audience: a news reader scanning today’s coverage. Job: see the top stories and the left / center / right split on each card.
  - THESIS: The home page is a measured news sheet. It refuses a hero, a featured-story mosaic, and the design-system specimen board.
  - OWN-WORLD: The Skew sheet. Poppins, `#F6F6F6` ground, white 12px hairline cards, ink pills, bias bar in `#B42318` / `#E5E7EB` / `#1D4ED8`.
  - STORY: The reader lands on Top News, scans twelve stories, and reads each framing bar as an estimate printed on the card.
  - FIRST VIEWPORT: Utility line, Skew header with four nav items and Subscribe / Login, topic rail, “Top News”, first row of three cards. Primary action is Subscribe, top right.
  - FORM: The attached home-page reference, brief-pinned, the only candidate. seed:191526378e887c52
  - FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

  Do not copy that contract into components, comments, or DOM attributes.

## Security requirements

- No secrets, no service-role client, no browser calls to Oxylabs, OpenAI, Clerk, or admin routes.
- The page does not read or write Supabase.
- Photographs stay local files cropped from the supplied reference.
- Footer and header controls do not submit forms and do not put secrets in the URL.

## Acceptance criteria

- `/` renders the utility bar, header, topic rail, “Top News”, all twelve stories, and the footer.
- `/design-system` still renders the design-system board, including the 25/50/25 meter and the 25/50/49 specimen card.
- The wordmark reads Skew. Poppins is the only text face.
- Bias colors, card radius, and the sheet ground match `DESIGN.md`.
- Every reference headline, topic, place, and source count is present. Bias numbers match the reference after the digit check.
- Subscribe, Login, theme words, location, edition, chips, info pips, and footer links do not navigate and do not change the color scheme.
- At 390px every story is reachable, the topic rail scrolls inside itself, and the page has no horizontal page scroll.
- The page does not request `/api/*`.
- `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` succeed.

## Checks to run

From the project root:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`

Do not add a `typecheck` script. Report the command output.

After the UI is in place, run the Impeccable detector once:

`C:\Users\jpilk\.cursor\skills\impeccable\scripts\impeccable.cmd detect --json app/page.tsx components/home app/design-system/page.tsx`

Fix detector findings that are real mismatches with this prompt. Do not restyle the page to satisfy a finding that fights the reference.

## Manual test steps

1. Start the dev server with `pnpm dev` if it is not already running.
2. Open `http://localhost:3000` at a 1440px-wide window. Compare it with the reference: utility line, Skew header, four nav items, Subscribe and Login, nine topic chips, “Top News”, twelve cards in three columns, bias bars, source counts, and the black footer.
3. Confirm the first card is the Iran proposal story and the last card is the Canada wildfires story.
4. Click Subscribe, Login, Dark, Auto, a topic chip, an info pip, and a footer link. The URL stays on `/` and the page stays light.
5. Open `http://localhost:3000/design-system` and confirm the design-system board is intact.
6. Narrow the window to 390px. Confirm one card column, a scrolling topic rail, a menu that reveals For You, Local, and Blindspot, and no sideways page scroll.
7. Tab through the header and the first card. Confirm a visible focus ring and names on the menu, info pip, and social buttons.
