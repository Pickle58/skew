# Remove Provide Feedback

## Goal

Remove the unused "Provide Feedback" button and its PostHog click handler from the news details AI Summary section. No backend, schema, or API exists for this feature.

## Skills read

- None required (UI-only removal; no Clerk, Supabase, Oxylabs, or AI SDK changes)

## Existing code inspected

- `components/article/article-page.tsx` — renders `<AnalysisFeedbackButton>` under the AI Summary disclaimer
- `components/article/analysis-actions.tsx` — defines `AnalysisFeedbackButton` (PostHog `analysis_feedback_clicked`) and `BiasMethodologyButton`

## Decisions or assumptions

- Keep `BiasMethodologyButton` and its PostHog event unchanged
- Do not touch unrelated "feedback" mentions (Next.js `agentFeedback`, Supabase skill feedback docs, historical prompt notes)
- No API route, Supabase table, or form to remove

## Files likely to change

- `prompts/remove-provide-feedback.md` (this file)
- `components/article/article-page.tsx`
- `components/article/analysis-actions.tsx`

## Implementation requirements

1. In `article-page.tsx`, drop `AnalysisFeedbackButton` from the import and remove `<AnalysisFeedbackButton articleId={article.id} />`.
2. In `analysis-actions.tsx`, delete `AnalysisFeedbackButton` entirely; keep `BiasMethodologyButton`.

## Security requirements

- No secrets or server boundaries change
- Do not introduce client exposure of server-only env vars

## Acceptance criteria

- AI Summary section shows title, meta, body, and "AI summaries can make mistakes." with no Provide Feedback button
- "How We Analyze Bias" still works
- No remaining `AnalysisFeedbackButton`, `analysis_feedback_clicked`, or `"Provide Feedback"` in app source (`components/`, `app/`, `lib/`)

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps

1. Start the app with `npm run dev` if not already running.
2. Open a news details page that has an AI Summary.
3. Confirm the AI Summary section has no "Provide Feedback" button.
4. Confirm "How We Analyze Bias" is still present and clickable elsewhere on the page.
