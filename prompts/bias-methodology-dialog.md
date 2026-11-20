# Bias methodology dialog

## Goal

Make the article sidebar **How We Analyze Bias** button open a small dialog that explains how Skew’s AI estimates political framing — matching the real analysis pipeline, not the old “publication lean / source weighting” mock copy.

## Skills read

- None required beyond existing UI patterns (no Clerk / Supabase / Oxylabs / AI SDK changes).
- Inspected project patterns in `components/ui/button.tsx`, `components/article/*`, and `lib/ai/analyze-article.ts`.

## Existing code inspected

- `components/article/analysis-actions.tsx` — `BiasMethodologyButton` currently only fires `posthog.capture("bias_methodology_clicked", …)` and does nothing visible.
- `components/article/article-page.tsx` — button sits under the Bias Analysis card; stored `analysis.disclaimer` already shows under the bars.
- `lib/ai/analyze-article.ts` — real rules: article text only (not outlet name); left/center/right percentages sum to 100; label is left/center/right/mixed/unclear; confidence 0–1; framing notes + loaded terms; fixed disclaimer string.
- No Dialog/Sheet/Radix in the project (`package.json` has no `@radix-ui/*`). Keep a minimal native or hand-rolled modal.

## Decisions / assumptions

- Use a **client-side modal dialog** (native `<dialog>` with `showModal()` preferred) — no new dependency.
- Keep the PostHog `bias_methodology_clicked` event on open.
- Copy must describe **text-based AI framing**, not source-weighted publication bias (that mock line was replaced in the live disclaimer).
- Also wire the Bias Analysis **Info** (“About this estimate”) button to open the same dialog — same intent, currently also a no-op.
- Do not change Provide Feedback, Save, Share, or analysis pipeline code.
- Static product copy only; no per-article AI call.

## Files likely to change

- `components/article/analysis-actions.tsx` — open dialog from `BiasMethodologyButton`; optionally export a shared open control for the Info button.
- `components/article/bias-methodology-dialog.tsx` (new) — dialog markup + copy + close/Escape/backdrop behavior.
- `components/article/article-page.tsx` — pass shared dialog / connect Info button if needed.
- Optionally a tiny shared copy constant if reused next to `ANALYSIS_DISCLAIMER` (UI-safe client module, not `server-only` `analyze-article.ts`).

## Implementation requirements

1. **Open on click** of “How We Analyze Bias”.
2. **Dialog content** (concise, reader-facing, match real pipeline):
   - Title: How we analyze bias (or How We Analyze Bias).
   - Explain AI reads this article’s title and text only — not the outlet’s reputation.
   - Explain left / center / right shares that sum to 100%, plus a framing label (left, center, right, mixed, or unclear).
   - Mention confidence, framing notes, and loaded terms at a high level.
   - Restate that framing is AI-estimated and not objective truth (align with `ANALYSIS_DISCLAIMER`).
3. **Close** via Close button, Escape, and backdrop click (native dialog cancel is fine).
4. **A11y**: `aria-labelledby` / dialog label, focus trap via native `<dialog>`, restore focus on close.
5. **Visual**: match Skew tokens — `panel`, `line`, `ink`, `muted`, rounded panel, Poppins already on the page. Keep it small; one composition, no new design system.
6. Optionally open the same dialog from the Bias Analysis Info button.

## Security requirements

- Client-only UI; no secrets, no scraping/analysis calls from the browser.
- Static copy only.

## Acceptance criteria

- Clicking **How We Analyze Bias** opens a visible dialog with methodology copy.
- Closing works (button / Escape / backdrop).
- PostHog event still fires on open.
- Copy does not claim publication-level source weighting.
- Typecheck and lint pass.
- Homepage / other pages unchanged except article details behavior.

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Manual test steps

1. Open an analyzed article (e.g. `http://localhost:3000/news/<id>` while signed in).
2. Click **How We Analyze Bias** — dialog opens with methodology copy.
3. Confirm PostHog still receives `bias_methodology_clicked` if you have the toolbar open (optional).
4. Press Escape and/or click outside / Close — dialog closes; page stays on the article URL.
5. If Info is wired: click the Bias Analysis info icon — same dialog opens.
6. Confirm the stored disclaimer under the bars is unchanged.
