# Skew news details page

## Goal

Add the news details page from the attached reference. Match that page’s layout, type, color, spacing, controls, and copy. Do not redesign it.

Reference image: `C:\Users\jpilk\.cursor\projects\c-Users-jpilk-Documents-Projects-skew\assets\03-news-details-page-fdb9deae-c7a5-4a56-a30f-8950b9bba53c.jpg`

The reference is a desktop article sheet. Build that desktop reading, then adapt it down.

This session is code-led. The attached page pins the composition, so there is no concept-seed round. The established Skew world in `DESIGN.md` stays: Poppins, sheet gray, white hairline panels, pill controls, and the red / hairline / blue bias colors. This page is a new surface in that world.

The wordmark in a misread of the reference must still say Skew. The product name is Skew.

## Skills read

- `.cursor/skills/impeccable/SKILL.md` and `reference/new-work.md`. The attached details page pins the composition. Mode is Read. Do not run a direction or surface tournament.
- `PRODUCT.md` and `DESIGN.md`.
- Next.js App Router patterns already in `app/layout.tsx` and `app/page.tsx`. `node_modules/next/dist/docs/` is empty in this install. Follow the installed `LayoutProps` usage. A dynamic segment uses a folder such as `app/news/[id]/page.tsx`.
- Read `reference/craft-floor.md` immediately before the first UI edit.

Project skills for Clerk, Supabase, Oxylabs, and the AI SDK do not apply. This page does not authenticate, query Supabase, scrape, or analyze.

## Existing code inspected

- `app/page.tsx` — home grid of `stories` inside `SiteHeader` and `SiteFooter`.
- `app/layout.tsx` — Poppins 400–800, metadata title `Skew`, body `bg-surface font-sans text-ink`.
- `app/globals.css` — tokens for ink, muted, surface, panel, panel-muted, line, bias-left, bias-right, footer-muted, shadows, radii.
- `components/home/site-header.tsx` — utility bar, header, topic rail. Client component. The details reference has the utility bar and header and does not have the topic rail.
- `components/home/site-footer.tsx` — full-bleed ink footer. The details reference adds a newsletter band above that footer. The home page does not show that band.
- `components/home/news-card.tsx` — home card. Not a link today.
- `components/home/stories.ts` — twelve static stories. `trump-iran` is the article this page shows: Politics, United States, left 20, center 31, right 49, 12 sources, `/home/trump-iran.jpg`.
- `components/ui/bias-meter.tsx` — stacked bar. Full labels read “Left n% / Center n% / Right n%”. Compact labels read “L n%”.
- `components/ui/button.tsx` — `primary | secondary | text`, `solid | outline`, sizes `default` (28px) and `header` (36px).
- `components/brand/wordmark.tsx` — `tone` `default | inverse`, sizes including `footer`.
- No `lib/` directory, no article queries, no details route.

## Decisions or assumptions

- Route is `/news/trump-iran`. The page reads the `trump-iran` story from `stories.ts` and the article body from a typed const beside it. Any other id renders the existing Next.js not-found state. Do not add a catalog, a fetch, or a second full article.
- The Iran card on `/` links to `/news/trump-iran`. The other eleven home cards stay non-links.
- Header and footer stay the shared components. The details page hides the topic rail. The home page still shows it. The newsletter band is rendered only on the details page, above `SiteFooter`.
- Copy, percentages, source names, byline, and dates below are the reference content. Do not add sentiment, confidence, framing notes, loaded terms, or a disclaimer block the reference does not show. The short line under the AI summary is the only disclaimer.
- Header Subscribe, Login, theme words, Set Location, International Edition, Save, Share, the more menu, info buttons, “How We Analyze Bias”, “Provide Feedback”, “View All Sources”, related cards, and footer links are visible controls. They do not navigate, open menus, change theme, or call an API. The newsletter field does not submit.
- The utility date stays the shared header date: “Monday, June 1, 2026”. The article’s own dates are May 31, 2026.
- Photographs are crops of the hero and the six related thumbnails in the reference, saved under `public/news/`. Reuse `/home/trump-iran.jpg` for the hero only if that crop is the same cabinet photograph; otherwise crop the hero from the details reference. Do not generate new portraits, fetch news-site images, or hotlink remote URLs.
- Lucide supplies bookmark, share, more-horizontal, and info. Do not add an icon package.

## Files likely to change

- `.impeccable/surfaces/app-news-id-page-tsx.md` — direction contract for this route. Create it with the surface-brief script before page code.
- `app/news/[id]/page.tsx` — the details page.
- `app/news/[id]/not-found.tsx` — short not-found state in the same sheet (header, one sentence, footer). No new visual system.
- `components/home/site-header.tsx` — optional `showTopics`, default `true`.
- `components/home/news-card.tsx` — optional `href`. When set, the card is a link. The info pip stays a button and does not follow the link.
- `components/article/article.ts` — typed article body, sidebar, sources, and related stories for `trump-iran`.
- `components/article/article-page.tsx` — article column, sidebar, related grid, newsletter.
- `components/article/bias-rows.tsx` — the three labeled horizontal bars in Bias Analysis, if `BiasMeter` cannot draw separate rows without changing the home and design-system meters.
- `public/news/*.jpg` — hero (if not reused) and six related crops.
- A one-off crop script may be added and then removed.

Do not edit `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, this prompt, or the home page layout except the Iran card link and the header prop.

## Visual interpretation

The page sits on `#F6F6F6`. Content is the same centered 1280px column with 24px side margin. Panels are white, 12px radius, 1px `#E5E7EB`, flat. The footer is the existing full-bleed `#00000F` band.

The details header is the existing utility bar and header row only. No topic rail.

Desktop order:

1. Utility bar and header.
2. A two-column article row. The story column is about two thirds. The sidebar is about one third, sticky only if it still fits the viewport; otherwise it scrolls with the page.
3. “Related Stories”, then a 3-column grid of six cards.
4. Newsletter band.
5. Existing footer.

### Article column

- Eyebrow, 11px, muted: “Politics · United States”.
- Title, the design-system headline step: 32px bold, ink, line-height 1.2: “Trump Sends Iran Revised Peace Proposal With Tougher Terms: Report”.
- Meta row, 13px, muted: “By David Morgan”, then “May 31, 2026”, then “12 min read”, separated by middle dots. On the right of that row: icon buttons for Save (bookmark), Share, and More. Each has an accessible name. They are 32px rounds, white, hairline.
- Hero photograph, full column width, about 16:9, 12px radius, `object-cover`.
- Caption under the photo, 11px, muted, two lines: “President Donald Trump in the Cabinet Room at the White House, Washington, D.C., May 30, 2026.” and “Photo: Andrew Harnik/Getty Images”.
- Bias distribution. Label “Bias Distribution” at 13px medium, then “12 sources” in muted caption under it or beside it as the reference reads. The bar is the existing full-label `BiasMeter`: Left 20%, Center 31%, Right 49%. No 0–100 scale.
- Body, 16px, ink, line-height 1.6, paragraphs separated by about 16px. Use this copy:

  The Trump administration has sent Iran a revised nuclear deal proposal that includes tougher terms on uranium enrichment and stronger verification measures, according to a report published Saturday.

  The new proposal, delivered through intermediaries in Oman, requires Iran to halt all uranium enrichment on its soil and ship its stockpile of enriched uranium out of the country. It also demands unrestricted access for international inspectors to all Iranian nuclear facilities, including military sites.

  “This is a take-it-or-leave-it proposal,” a senior administration official told the Wall Street Journal. “The President wants a deal, but he will not accept a weak agreement that puts America or our allies at risk.”

  Iran has not yet officially responded to the proposal. However, Iranian Foreign Minister Hossein Amir-Abdollahian said last week that any deal must respect Iran’s right to peaceful nuclear energy and include the lifting of all U.S. sanctions.

  The revised proposal comes after several rounds of indirect talks between U.S. and Iranian officials failed to produce a breakthrough. The Trump administration has warned that if diplomacy fails, it is prepared to take other action to prevent Iran from obtaining a nuclear weapon.

  European allies have urged both sides to continue negotiations. “We believe diplomacy is still the best path forward,” said a spokesperson for the EU’s foreign policy chief.

  Israel, which has long opposed the 2015 nuclear deal with Iran, praised the Trump administration’s tougher stance. “This is the kind of leadership that was missing in the past,” said Israeli Prime Minister Benjamin Netanyahu in a statement.

  The fate of the proposal now rests with Iran, as global attention remains focused on whether a new nuclear agreement can be reached—or if tensions will escalate further.

### Sidebar

Three white hairline panels, stacked with about 16px between them, padding about 16px.

**Bias Analysis**

- Title “Bias Analysis”, 16px semibold, and a 20px info button named “About this estimate”.
- “Overall Bias” in muted caption. “Right 49%” in `#1D4ED8`, about 20px semibold.
- “Based on 12 balanced sources”, 11px muted.
- Three rows. Each row is a caption label, a percentage, and a horizontal bar on `#F0F0F0` (panel-muted) with a colored fill:
  - Left, 20%, fill `#B42318`
  - Center, 31%, fill `#E5E7EB` with an ink edge so the bar stays visible
  - Right, 49%, fill `#1D4ED8`
- Paragraph, 13px, muted, line-height 1.6: “Our analysis is based on the political leaning of the publication and how the story is framed. Sources are weighted by reliability and recency.”
- “How We Analyze Bias” as primary outline, default button size, full width of the panel.

**AI Summary**

- Title “AI Summary”, 16px semibold.
- “Generated May 31, 2026 · 3 min read”, 11px muted.
- A bulleted list, 14px, ink, five items:
  - The Trump administration has sent Iran a revised nuclear deal proposal with tougher terms, including a complete halt to uranium enrichment and the removal of enriched uranium stockpiles.
  - The proposal also demands unrestricted inspector access to all nuclear sites, including military facilities.
  - Iran has not responded officially but says any deal must respect its right to peaceful nuclear energy and include sanctions relief.
  - The U.S. warns it is prepared to take other action if diplomacy fails, while European allies urge continued negotiations.
  - Israel supports the tougher stance, praising the administration’s determination to prevent Iran from obtaining nuclear weapons.
- Italic muted caption: “AI summaries can make mistakes.”
- “Provide Feedback” as primary outline, default size.

**Source Breakdown**

- Title “Source Breakdown”, 16px semibold.
- “12 Total Sources”, 13px medium.
- Three compact lines, caption size: “Left” with “2 (20%)”, “Center” with “4 (31%)”, “Right” with “6 (49%)”. Color the count with the matching bias color. Center count stays ink.
- “Top Sources”, 13px medium, then this list. Outlet name on the left, bias label on the right, 13px. The bias word uses the bias color (Right blue, Left red, Center muted):
  - Fox News — Right
  - The Wall Street Journal — Center
  - Reuters — Center
  - BBC — Left
  - CNN — Left
  - The New York Times — Center
  - The Washington Post — Center
  - Newsmax — Right
- “View All Sources” as primary outline, default size.

### Related Stories

Section title “Related Stories”, 24px semibold, left aligned with the grid, about 16px above the cards.

Six white hairline cards, the same card language as home, in this order:

| id | topic | place | title | read | file |
| --- | --- | --- | --- | --- | --- |
| iran-pressure | World | Middle East | Iran Says It Will Not Negotiate Under ‘Maximum Pressure’ | 9 min read | iran-pressure.jpg |
| diplomacy | Politics | United States | Bipartisan Group Urges Diplomacy With Iran | 6 min read | diplomacy.jpg |
| sanctions | Politics | United States | US Sanctions More Iranian Entities Over Nuclear Program | 8 min read | sanctions.jpg |
| deal-2015 | Science | Nuclear Policy | What’s in the 2015 Iran Nuclear Deal? | 11 min read | deal-2015.jpg |
| oman | World | Middle East | Oman Hosts Another Round of US-Iran Nuclear Talks | 7 min read | oman.jpg |
| israel-red-line | World | Middle East | Israel Reaffirms Red Line Over Iranian Nuclear Program | 5 min read | israel-red-line.jpg |

Each card: photograph about 16:10 with 12px radius, eyebrow “{topic} · {place}” at 11px muted, title at 16px semibold, read time at 11px muted. No bias bar. No info pip. Cards are not links. Image alt text is the title.

### Newsletter

A white hairline panel, 12px radius, inside the column, above the footer. One row on desktop:

- Left: “Stay Informed. Stay Balanced.” at 20px semibold, and under it the caption “Get the top stories and bias analysis delivered to your inbox.”
- Right: an email input with placeholder “Enter your email”, hairline, 12px radius or a pill if the reference is pill-shaped, then a primary solid Subscribe button at header size.

The input label is the placeholder, with an accessible name “Email”. The form does not submit.

## Layout, spacing, color, type

Use the tokens already in `app/globals.css`. Do not add a second palette.

Type stays Poppins. The article title uses the 32px bold headline step. Section titles use the 24px semibold title step. Body is 16px. Sidebar panel titles are 16px semibold. Meta and captions stay 13px and 11px.

## Responsiveness

At 1280px and wider, the page matches the reference: header on one line, article and sidebar side by side, related stories in three columns, newsletter on one row.

From 768px to 1279px, the sidebar drops under the article. Related stories go to two columns. The newsletter may wrap the input under the heading.

Below 768px, one column. Related stories are one column. The header keeps the existing narrow menu behavior. Body text stays at least 16px. The page itself does not scroll sideways. Sidebar panels stay full width with 16px padding.

Check 1440px and 390px.

## Pixel-perfect expectations

On a 1440px-wide viewport the first screen should read as the reference: gray ground, utility line, Skew header with Home / For You / Local / Blindspot, Subscribe and Login, the Iran headline, byline, hero, and the Bias Analysis panel. A reviewer comparing the reference and the page should not find a different typeface, a different bias palette, a missing sidebar panel, or a rewritten headline.

Acceptable variance: softness from cropping the reference, subpixel rounding, and Lucide glyphs versus the reference icons. Not acceptable: the topic rail on this page, a dark theme, remote news images, sentiment or confidence widgets, or a restyled article layout.

## Implementation requirements

- TypeScript, no `any`. Imports at the top of each module.
- Server Components by default. The header is already a client component. Do not mark the article page as a client component.
- Article data is a typed const. The page maps it. Do not fetch.
- Reuse `Button`, `BiasMeter`, `Wordmark`, `SiteHeader`, and `SiteFooter`. Do not duplicate them.
- The home bias meter and the design-system board stay visually unchanged. Separate bias rows are a new component.
- Metadata title for this route: the article title, with the root description unchanged.
- Update the surface brief before the page code. Keep the six contract blocks and a seed line. Suggested contract:

  - Mode: Read. Audience: a news reader opening one story. Job: read the article and the AI-estimated framing beside it.
  - THESIS: The details page is one article with its estimate in a side sheet. It refuses a topic rail, a comment thread, and a second home grid above the story.
  - OWN-WORLD: The Skew sheet. Poppins, `#F6F6F6` ground, white 12px hairline panels, ink pills, bias colors `#B42318` / `#E5E7EB` / `#1D4ED8`.
  - STORY: The reader opens the Iran proposal, reads the piece, and checks the overall lean, the summary, and the source split without leaving the article.
  - FIRST VIEWPORT: Utility line, Skew header with four nav items and Subscribe / Login, the 32px headline and byline, the hero, and the Bias Analysis panel. Primary action is Subscribe, top right.
  - FORM: The attached news-details reference, brief-pinned, the only candidate. seed:191526378e887c52
  - FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

  Do not copy that contract into components, comments, or DOM attributes.

## Security requirements

- No secrets, no service-role client, no browser calls to Oxylabs, OpenAI, Clerk, or admin routes.
- The page does not read or write Supabase.
- Photographs stay local files cropped from the supplied reference or the existing home crop.
- The newsletter form does not send the address anywhere. Header and sidebar controls do not put secrets in the URL.

## Acceptance criteria

- `/news/trump-iran` renders the utility bar, header without the topic rail, the article, three sidebar panels, six related cards, the newsletter, and the existing footer.
- `/` still renders twelve cards and the topic rail. The Iran card navigates to `/news/trump-iran`. The other cards do not navigate.
- `/design-system` still renders the design-system board.
- `/news/not-a-story` renders the not-found state.
- The wordmark reads Skew. Poppins is the only text face.
- Bias colors and the sheet ground match `DESIGN.md`.
- The headline, byline, body paragraphs, summary bullets, source list, and related titles match this prompt.
- Save, Share, More, info, outline buttons, related cards, theme words, and footer links do not navigate and do not change the color scheme. The newsletter does not submit.
- At 390px the article, sidebar, and related stories stack, and the page has no horizontal page scroll.
- The page does not request `/api/*`.
- `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` succeed.

## Checks to run

From the project root:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`

Do not add a `typecheck` script. Report the command output.

After the UI is in place, run the Impeccable detector once:

`C:\Users\jpilk\.cursor\skills\impeccable\scripts\impeccable.cmd detect --json app/news components/article components/home/news-card.tsx components/home/site-header.tsx`

Fix detector findings that are real mismatches with this prompt. Do not restyle the page to satisfy a finding that fights the reference.

## Manual test steps

1. Start the dev server with `pnpm dev` if it is not already running.
2. Open `http://localhost:3000` at a 1440px-wide window. Click the Iran card. The URL becomes `/news/trump-iran`.
3. Compare the details page with the reference: Skew header, no topic rail, headline, byline, hero, bias bar, article text, Bias Analysis, AI Summary, Source Breakdown.
4. Scroll to Related Stories, the newsletter, and the footer. Confirm six related cards and “Stay Informed. Stay Balanced.”
5. Click Save, Share, How We Analyze Bias, Provide Feedback, View All Sources, a related card, Subscribe, and Login. The URL stays on `/news/trump-iran` and the page stays light. Submit the email field. Nothing is sent and the URL does not change.
6. Open `http://localhost:3000/news/not-a-story` and confirm the not-found state.
7. Return to `/` and confirm the topic rail is still there and a non-Iran card does not navigate.
8. Narrow `/news/trump-iran` to 390px. Confirm one column, the existing menu, and no sideways page scroll.
9. Tab through the byline actions and the first sidebar button. Confirm a visible focus ring and names on Save, Share, More, and the info button.
