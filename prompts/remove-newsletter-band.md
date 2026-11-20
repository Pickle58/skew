# Remove newsletter Subscribe band

## Goal

Remove the article-details newsletter CTA (“Stay Informed. Stay Balanced.” / email / Subscribe) and delete its component.

## Skills read

- Impeccable distill (Operate): drop non-product chrome.

## Existing code inspected

- `components/article/newsletter-form.tsx` — client form; preventDefault + PostHog `newsletter_subscribed`.
- `components/article/article-page.tsx` — renders `<NewsletterForm />` above the footer.

## Decisions / assumptions

- Delete the component file; do not leave a stub.
- Keep scraping `newsletter` reject/clean rules (not UI).
- Provide Feedback / Save / Share out of scope.

## Files likely to change

- Delete `components/article/newsletter-form.tsx`
- `components/article/article-page.tsx` — remove import and usage

## Implementation requirements

1. Remove `NewsletterForm` import and `<NewsletterForm />` from article page.
2. Delete `newsletter-form.tsx`.
3. Confirm no remaining imports of `NewsletterForm`.

## Security requirements

- N/A (removal only).

## Acceptance criteria

- Article details has no newsletter band.
- `newsletter-form.tsx` gone; typecheck and lint pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps

1. Open an article details page.
2. Scroll to bottom — related stories (if any) then footer; no Stay Informed / Subscribe band.
