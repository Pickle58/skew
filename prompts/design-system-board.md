# Design system board

## Goal

Replace the Next.js starter look with the Skew design system, and make the home page a faithful rebuild of the attached design-system board.

The board is the binding visual reference. Match its layout, type, color, spacing, components, and copy. Do not redesign it.

Reference image: `C:\Users\jpilk\.cursor\projects\c-Users-jpilk-Documents-Projects-skew\assets\01-ui-design-system-d222894b-5a57-4043-a633-eed1f87a4d92.jpg`

This session is code-led. The page is a design document, and the attached board is the composition to match. That path is not stored as a project default.

## Skills read

- `.cursor/skills/impeccable/SKILL.md` (design implementation). `impeccable context` was run for `app`.
- `PRODUCT.md` written from the confirmed product record.
- Next.js font usage already in `app/layout.tsx` (`next/font/google`). `node_modules/next/dist/docs/` is empty in this install, so follow the font pattern already in the layout and the installed `next/font` types. Do not guess a different font API.

Project skills for Clerk, Supabase, Oxylabs, and the AI SDK do not apply. This page does not touch auth, data, scraping, or analysis.

## Existing code inspected

- `app/layout.tsx` — Geist and Geist Mono, metadata still “Create Next App”, body is a full-height column.
- `app/page.tsx` — renders the text “Home”.
- `app/globals.css` — Tailwind v4 `@import "tailwindcss"`, default `--background` / `--foreground`, and a `prefers-color-scheme: dark` override. Body font is Arial.
- `package.json` — Next 16.4.6, React 19.3.0, Tailwind 4.3.3. No component library, no icon package, no `typecheck` script.
- `next.config.ts` — `cacheComponents`, `partialPrefetching`, Tailwind turbopack rule.
- `tsconfig.json` — `@/*` maps to the project root.
- No `components/` directory, no `prompts/` files before this one, no `DESIGN.md`.

## Decisions or assumptions

- The board is the home page at `/`. The app has no other route to put it on. A later news-feed task can replace this page; the tokens and components should be reusable when that happens.
- Build the tokens in `app/globals.css` with Tailwind v4 `@theme`, and build the repeated controls as components the board actually uses: button, category chip, and bias meter. The board page composes those components so the specimen and the system cannot drift.
- Icons are Lucide (`lucide-react`), 24px, stroke width 2, round caps and joins. That is the board’s “Line style · 2px stroke · Rounded caps.” Do not draw a custom icon set.
- The card photograph is cropped from the reference image into `public/design-system/card-photo.jpg`. Do not generate a new portrait and do not fetch a different photo of a real person.
- There is no dark theme. Remove the `prefers-color-scheme: dark` override. The board is a light document.
- Specimen copy is copied from the board, including the card labels `Left 25%`, `Center 50%`, and `Right 49%` even though those three numbers do not sum to 100. The separate bias-meter specimen stays `Left 25%` / `Center 50%` / `Right 25%`.
- Text primary is the swatch label `#00000F`. Text secondary is `#68728D`. Surface is `#F6F6F6`.
- Do not add Clerk, Supabase, shadcn, or a news feed in this pass.
- Poppins is loaded with `next/font/google` at weights 400, 500, 600, and 700. Those map to Regular, Medium, Semibold, and Bold.

## Files likely to change

- `app/globals.css` — tokens, type styles, removal of the dark-scheme override.
- `app/layout.tsx` — Poppins, metadata, page ground.
- `app/page.tsx` — the board.
- `components/ui/button.tsx`
- `components/ui/chip.tsx`
- `components/ui/bias-meter.tsx`
- `components/brand/wordmark.tsx`
- `public/design-system/card-photo.jpg` — crop of the reference portrait.
- `package.json` — add `lucide-react` only.

Do not edit `AGENTS.md`, `PRODUCT.md`, or this prompt while implementing.

## Visual interpretation

The page is a design-system sheet on a `#F6F6F6` ground. White panels with a 1px `#E5E7EB` border and 12px radius sit in a 1280px container with 24px page margin and about 16px gaps. Panel titles are 11px, uppercase, tracked, color `#68728D`.

Desktop reading order, three rows plus a footer:

1. Brand (narrow) · Typography (wide) · UI elements (wide).
2. Colors · Icons · Card example.
3. Spacing · Grid · Shadows · Border radius.
4. A black footer bar with 12px radius, inside the same page margin, not flush to the viewport edge.

### Brand

Lockup: “Skew” in black, extra-bold, about 40px, tight tracking. “News” in `#68728D`, about 14px, sitting at the lower right of the wordmark. Tagline under it, centered, `#68728D`, 14px, two lines: “Balanced news coverage, powered by AI.”

### Typography

Left column labeled FONT FAMILY. “Poppins” at about 32px bold. Under it, 13px secondary: “Poppins is a modern geometric sans-serif typeface that ensures clarity and excellent readability.”

Right side is a table. Headers: STYLE, SIZE, WEIGHT, LINE HEIGHT. Rows, in order:

| Style | Role | Size | Weight | Line height |
| --- | --- | --- | --- | --- |
| H1 | Page / Screen Title | 32px | Bold | 1.2 |
| H2 | Section Title | 24px | Semibold | 1.3 |
| H3 | Card / Module Title | 20px | Semibold | 1.3 |
| H4 | Subheading | 16px | Medium | 1.4 |
| Body Large | Important content | 16px | Regular | 1.6 |
| Body Medium | Body text | 14px | Regular | 1.6 |
| Body Small | Supporting text | 13px | Regular | 1.6 |
| Caption | Labels, meta text | 11px | Regular | 1.4 |

The style name is black. The role, size, weight, and line height are secondary gray. Do not render the H1–Caption names in their own display sizes inside the table; the table is a spec, set in body-small / caption.

### Colors

Three groups: PRIMARY, SEMANTIC, NEUTRALS. Each swatch is a rounded square about 56px, with a caption underneath (name, then hex).

Primary:

- Text primary `#00000F`
- Text secondary `#68728D`
- Surface `#F6F6F6` (this swatch needs the panel border so it does not disappear)

Semantic:

- Left bias `#B42318`
- Center `#E5E7EB`
- Right bias `#1D4ED8`

Neutrals:

- Bg primary `#FFFFFF`
- Bg secondary `#F0F0F0`
- Border `#E5E7EB`
- Divider `#E5E7EB`

### UI elements

**Buttons.** A small matrix. Columns: Default, Hover, Outline, Disabled. Rows: Primary, Secondary, Text.

- Primary default: black `#00000F` pill, white label.
- Primary hover: the same pill, shown as a static specimen (no need for a second interactive color if the board shows the same black).
- Primary outline: white pill, 1px `#00000F` border, black label.
- Primary disabled: `#F0F0F0` pill, `#68728D` label.
- Secondary default and outline: white pill, 1px `#E5E7EB` border, black label.
- Secondary hover: `#F0F0F0` fill, 1px border, black label.
- Secondary disabled: `#F0F0F0` fill, `#68728D` label.
- Text default: black label, no chrome.
- Text hover: `#1D4ED8` label.
- Text outline and text disabled: an em dash in secondary gray. Those variants do not exist.

Label is “Button”, about 13px medium. Pills use full radius. The matrix cells are specimens, not a live hover demo, except the real `Button` component must implement default, hover, outline, and disabled for primary and secondary, and default plus hover for text.

**Chips.** Label “CHIP / CATEGORY”. Four pills in a row: “World Cup”, “IPL”, “Business & Markets”, “More”. Each has a trailing plus icon. White fill, 1px `#E5E7EB` border, full radius, 13px black text.

**Bias meter.** Label “BIAS METER”. One rounded bar, about 8px tall or a thicker labeled bar matching the board (the board’s bar is roughly 28px tall with labels inside the segments):

- Left 25% — `#B42318`, white label “Left 25%”
- Center 50% — `#E5E7EB`, black label “Center 50%”
- Right 25% — `#1D4ED8`, white label “Right 25%”

Under the bar, a scale: 0% at the left, 50% in the center, 100% at the right, caption size, secondary color. The bar itself is full radius.

### Icons

Five columns, three rows, in this order:

1. menu, search, bookmark, clock, info
2. upload, external link, calendar, bar chart, tag
3. user, bell, sliders, check, ellipsis

Caption under the grid: “Line style · 2px stroke · Rounded caps”.

Use these Lucide icons: `Menu`, `Search`, `Bookmark`, `Clock`, `Info`, `Upload`, `ExternalLink`, `Calendar`, `ChartColumn`, `Tag`, `User`, `Bell`, `SlidersHorizontal`, `CircleCheck`, `Ellipsis`. Icons are black, about 22px, stroke 2.

### Card example

A white article specimen inside the panel.

- Left: the cropped portrait, about 148px wide, 12px radius. A small circled info icon sits at the portrait’s top-right.
- Eyebrow: “Politics · United States”, caption, secondary.
- Title, H3: “Trump Sends Iran Revised Peace Proposal With Tougher Terms: Report”
- Body, body-small, secondary: “The proposal includes stricter limits on uranium enrichment and enhanced verification measures.”
- Mini bias bar: red “Left 25%”, gray “Center 50%”, blue “Right 49%”. Same segment colors as the meter. Smaller height than the meter specimen. The card labels are the ones printed on the board.
- Meta row, caption, secondary: clock icon “2h ago”, and “12 min read”.

This card is reference content. Do not link it to a details route.

### Spacing

Title “SPACING SYSTEM” with a secondary aside “(4px BASE UNIT)”. Seven vertical bars in a row, growing in height, labeled 4px, 8px, 16px, 24px, 32px, 40px, 64px. Bar fill is the board’s soft lavender, about `#E4E4F6`, with a 4px top radius. Caption: “Consistent spacing scale based on 4px base unit”.

### Grid

Title “GRID SYSTEM”. A row of 12 soft-lavender vertical bars (`#E4E4F6`), even, with small gaps, standing in for the columns. To the right, a caption stack:

- Container 1280px
- Columns 12
- Gutter 24px
- Margin 24px

### Shadows

Three white squares, about 64px, 8px radius, 1px border, labeled:

- SMALL — `0px 1px 2px rgba(0,0,0,0.05)`
- MEDIUM — `0px 4px 12px rgba(0,0,0,0.08)`
- LARGE — `0px 12px 24px rgba(0,0,0,0.12)`

### Border radius

Four specimens labeled SMALL 4px, MEDIUM 8px, LARGE 12px, FULL 9999px. The first three are white squares with a border. FULL is a circle.

### Footer

Black `#00000F` bar, 12px radius, padding about 24px.

- Left: the same wordmark, inverted (white “Skew”, gray “News”), plus the tagline in a light gray.
- Center: “Design System v1.0” and “June 1, 2026”, light gray, caption.
- Right: “Stay consistent. Stay unbiased.” light gray.

## Layout, spacing, color, type

Tokens to define and use. Do not leave one-off hex values in the page except the lavender specimen bars, which are diagram ink, not a product color.

| Token | Value | Use |
| --- | --- | --- |
| text primary | `#00000F` | Headings, button label, icons, footer ground |
| text secondary | `#68728D` | Roles, captions, tagline, meta |
| surface | `#F6F6F6` | Page ground |
| bg primary | `#FFFFFF` | Panels, button fill |
| bg secondary | `#F0F0F0` | Disabled and secondary hover |
| border / divider / center | `#E5E7EB` | Panel borders, chip borders, center segment |
| left | `#B42318` | Left bias |
| right | `#1D4ED8` | Right bias, text-button hover |
| shadow sm | `0 1px 2px rgba(0,0,0,0.05)` | |
| shadow md | `0 4px 12px rgba(0,0,0,0.08)` | |
| shadow lg | `0 12px 24px rgba(0,0,0,0.12)` | |
| radius sm / md / lg / full | 4 / 8 / 12 / 9999 px | |
| space | 4, 8, 16, 24, 32, 40, 64 | 4px base |
| container | 1280px | |
| gutter / margin | 24px | |

Type scale is the table above, on Poppins only. No mono face.

## Responsiveness

At 1280px and wider, the board matches the reference: three columns on rows 1 and 2, and the row-3 split (spacing and grid wider, shadows and radius narrower). The container is 1280px, centered.

Below 1280px, panels stack in the same reading order: Brand, Typography, UI elements, Colors, Icons, Card, Spacing, Grid, Shadows, Border radius, then the footer. Do not drop a section. Footer contents stack. Chips wrap. The button matrix scrolls horizontally inside its panel if it would crush the labels. Body text stays at least 13px.

Check 1440px and 390px.

## Pixel-perfect expectations

On a 1440px-wide viewport the first screen should read as the same sheet as the reference: gray ground, white rounded panels, the brand lockup, the Poppins spec table, the button matrix, the 25/50/25 meter, and the start of the color and icon panels. A reviewer comparing the reference and the page should not find a different typeface, a different bias palette, a missing panel, or rewritten specimen copy.

Acceptable variance: subpixel rounding, the exact lavender of the diagram bars, and Lucide’s glyph shapes versus the board’s icons. Not acceptable: a different font, a news-feed homepage, dark mode, or a restyled “interpretation” of the board.

## Implementation requirements

- TypeScript, no `any`.
- Imports at the top of each module.
- Server Components by default. Add `"use client"` only if a component needs it. The board does not need client state. Button hover can be CSS.
- `Button` variants: `primary`, `secondary`, `text`. Appearances: `solid`, `outline`. Support `disabled`. Text variant has no outline and no disabled appearance; do not render a button for the em-dash cells.
- `BiasMeter` takes `left`, `center`, and `right` percentages and renders a single bar with labels inside the segments plus the 0 / 50 / 100 scale when `showScale` is set. The card specimen calls it without the scale and with 25 / 50 / 49.
- `Chip` takes a label and shows a plus icon.
- Wordmark takes a `tone` of `default` or `inverse`.
- Metadata title: `Skew`. Description: `Balanced news coverage, powered by AI.`
- Crop the portrait from the reference before building the card. Keep the crop tight on the person, as in the board.

## Security requirements

- No secrets, no service-role client, no browser calls to Oxylabs, OpenAI, or admin routes.
- The page is static specimen content. It does not read or write Supabase.
- The portrait crop stays a local public file derived from the supplied reference.

## Acceptance criteria

- `/` renders the full board, including every panel and the footer copy.
- Poppins is the only text face.
- Colors, type roles, spacing steps, radii, and shadows match the tables in this prompt.
- Primary, secondary, and text button specimens match the matrix, including the two em dashes.
- The meter specimen is 25 / 50 / 25. The card specimen is 25 / 50 / 49 with the reference headline and portrait.
- Icons are line icons at 2px stroke.
- No dark-mode swap.
- Desktop layout matches the board’s panel arrangement. At 390px every panel is still reachable and readable.
- `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` succeed.

## Checks to run

From the project root:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`

`package.json` has no `typecheck` script. Do not add one unless the build needs it. Report the command output.

## Manual test steps

1. Start the dev server with `pnpm dev` if it is not already running.
2. Open `http://localhost:3000` at a 1440px-wide window. Compare it with the reference image: panel order, wordmark, Poppins table, button matrix, chips, both bias bars, icon grid, spacing bars, 12-column diagram, shadow and radius specimens, and the black footer.
3. Narrow the window to 390px. Confirm every panel stacks, chips wrap, the button matrix does not overflow the page, and the footer copy remains readable.
4. Tab to the button specimens. Confirm a visible focus ring and that disabled specimens are not interactive.
5. Confirm the page does not request `/api/*` and does not flash a dark background.
