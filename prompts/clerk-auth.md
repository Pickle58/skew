# Clerk authentication

## Goal

Add Clerk authentication to Skew (Next.js 16.4.6 App Router, `cacheComponents: true`):

- Users can sign in, sign up, and sign out.
- The home page `/` stays public.
- The news details page `/news/[id]` requires sign-in. Signed-out visitors go to `/sign-in` and come back to the story after they sign in.
- The header shows **Login** to signed-out users and Clerk's `<UserButton />` to signed-in users.

Out of scope: Supabase user sync, webhooks, organizations, billing, roles, and custom sign-in flows. Admin and pipeline routes keep using `x-skew-admin-secret` (AGENTS.md section 15) or `CRON_SECRET`, not Clerk sessions.

## Skills read

- `.agents/skills/clerk/SKILL.md` (router) sent me to the two below.
- `.agents/skills/clerk-setup/SKILL.md`: manual setup, `proxy.ts` on Next 16+, `ClerkProvider` inside `<body>`, Suspense rules under `cacheComponents`, catch-all `<SignIn />`/`<SignUp />` wrapped in `<Suspense>`.
- `.agents/skills/clerk-nextjs-patterns/SKILL.md` plus `references/middleware-strategies.md` and `references/caching-auth.md`: keep `clerkMiddleware()` bare, call `await auth.protect()` in each protected page, add a `loading.tsx` next to a page that gates its whole render, never call `auth()` inside `'use cache'`, don't use the deprecated `createRouteMatcher`.
- `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`: reading the session at request time has to happen behind a Suspense boundary. Keep session reads out of the top level of layouts.

## Existing code inspected

- `package.json`: Next 16.4.6, React 19.3.0, pnpm (`pnpm-lock.yaml`). No Clerk package. No `typecheck` script, although AGENTS.md section 22 requires `npm run typecheck`.
- `next.config.ts`: `cacheComponents: true`, `partialPrefetching: true`.
- `.env.local`: already defines `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. I only checked the key names, not the values. There is no `.env.example`.
- `app/layout.tsx`: Poppins font, `<body className="min-h-full bg-surface font-sans text-ink">`. No provider.
- No `proxy.ts` or `middleware.ts`.
- `components/home/site-header.tsx` (`"use client"`): static outline **Login** `Button` on desktop (`hidden md:contents`) and in the mobile `#section-menu`. Used by `app/page.tsx`, `components/article/article-page.tsx`, and `app/news/[id]/not-found.tsx`.
- `components/ui/button.tsx`: renders a native `<button>` and spreads props, so it can be the child of Clerk's `<SignInButton>`.
- `components/brand/wordmark.tsx`: Skew wordmark (`size="brand" | "footer"`).
- `app/news/[id]/page.tsx`: async page with `generateStaticParams` (`trump-iran`), `generateMetadata`, and `notFound()`.
- `app/globals.css`: tokens `ink`, `muted`, `surface`, `panel`, `line`, `bias-right`; font `--font-poppins`.
- No `components.json`, so the shadcn `@clerk/ui` theme step does not apply.

## Decisions or assumptions

- **Access model (user-approved):** `/` is public and `/news/[id]` requires sign-in.
- **No `clerk init`.** Keys already exist, and the skill warns that `init` can create a second application and overwrite them. Install manually and do not touch the existing keys.
- **Current SDK:** `@clerk/nextjs` v7 (latest is 7.10.1), installed with `pnpm add @clerk/nextjs`. Use `<Show>`, not `SignedIn`/`SignedOut`.
- **Dedicated auth pages** at `/sign-in` and `/sign-up`, matching the `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` variables listed in AGENTS.md section 21. No modal mode.
- **Header controls stay client-side.** `SiteHeader` is already a Client Component, so `<Show>` reads client auth state there and needs no Suspense. It renders nothing until Clerk loads, which is acceptable.
- **No separate "Sign up" button in the header**, to keep the approved design. Clerk's sign-in card links to sign-up.
- **Protection lives in the page**, not the proxy. `NewsPage` calls `await auth.protect()` first, before the article lookup and `notFound()`. `generateMetadata` stays unauthenticated because it only returns the public title.
- `auth.protect()` reads the request, so add `app/news/[id]/loading.tsx` to give the page a Suspense boundary. Signed-out requests may come back as `200` with a client-side redirect, because the redirect happens after streaming starts. That is expected; see the skill.
- Add `"typecheck": "tsc --noEmit"` to `package.json` so the required AGENTS.md check can run.
- Create `.env.example` with **only the Clerk variables** and placeholder values. The other variables get added when their features land.
- Style Clerk components with `appearance.variables` from the existing tokens. No new theme package.

## Files likely to change

- `package.json`, `pnpm-lock.yaml`: add `@clerk/nextjs` and the `typecheck` script.
- `proxy.ts` (new): bare `clerkMiddleware()` plus the standard matcher.
- `app/layout.tsx`: wrap body content in `<ClerkProvider>` with appearance variables.
- `app/sign-in/[[...sign-in]]/page.tsx` (new)
- `app/sign-up/[[...sign-up]]/page.tsx` (new)
- `components/auth/auth-shell.tsx` (new): shared centered layout for both auth pages (wordmark plus card slot).
- `components/home/site-header.tsx`: Login uses `SignInButton`, and signed-in users see `UserButton`.
- `app/news/[id]/page.tsx`: `await auth.protect()`.
- `app/news/[id]/loading.tsx` (new)
- `.env.example` (new)

## Implementation requirements

1. **Install:** `pnpm add @clerk/nextjs`.
2. **`proxy.ts`** at the project root:
   ```ts
   import { clerkMiddleware } from "@clerk/nextjs/server";

   export default clerkMiddleware();

   export const config = {
     matcher: [
       "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
       "/(api|trpc)(.*)",
     ],
   };
   ```
   Do not use `createRouteMatcher` or put route logic in the proxy.
3. **`app/layout.tsx`:** put `<ClerkProvider>` inside `<body>`, around `{children}`. Keep it outside any Suspense boundary so the shell still prerenders. Appearance variables:
   - `colorPrimary`: `#00000f` (`--skew-ink`)
   - `colorText`: `#00000f`, `colorTextSecondary`: `#68728d` (`--skew-muted`)
   - `colorBackground`: `#ffffff`, `colorInputBackground`: `#ffffff` (`--skew-panel`)
   - `fontFamily`: `var(--font-poppins), sans-serif`
   - `borderRadius`: `8px` (`--radius-md`)
   - Check these variable names against the installed `@clerk/nextjs` v7 types before you use them.
4. **Auth pages:** each catch-all page is a synchronous Server Component that renders `AuthShell` with `<Suspense fallback={…}>` around `<SignIn />` / `<SignUp />`. The fallback is a neutral placeholder the size of the card, so the layout doesn't shift.
5. **`AuthShell`:** full-height `bg-surface` column, centered. `Wordmark size="brand"` linking to `/`, then the Clerk card below it. Do not include `SiteHeader` or `SiteFooter` on auth pages.
6. **`SiteHeader`:** inside the right-hand group and the mobile menu:
   - `<Show when="signed-out"><SignInButton><Button size="header" appearance="outline">Login</Button></SignInButton></Show>`
   - `<Show when="signed-in"><UserButton /></Show>`
   - Keep the existing `hidden md:contents` desktop and mobile-menu behavior exactly as it is. **Subscribe** is unchanged.
   - Size the `UserButton` avatar to the 36px header controls (`appearance.elements.avatarBox`).
7. **`app/news/[id]/page.tsx`:** call `await auth.protect();` on the first line of `NewsPage`, before `await params`. Leave `generateStaticParams` and `generateMetadata` unchanged. If `next build` rejects `generateStaticParams` together with the request-time read, remove `generateStaticParams` and note it in the summary.
8. **`app/news/[id]/loading.tsx`:** lightweight skeleton. Header placeholder plus a muted block on `bg-surface`. No data access.
9. **`.env.example`:**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
   ```
   The agent must not read or edit `.env.local`. The user adds the four URL variables to `.env.local` (see the manual test steps).
10. Add `"typecheck": "tsc --noEmit"` to `package.json` scripts.
11. Don't add Clerk calls anywhere else, and don't refactor unrelated code.

## Security requirements

- `CLERK_SECRET_KEY` is only read by server code (`@clerk/nextjs/server` and the proxy). Never import server modules into Client Components.
- Only `NEXT_PUBLIC_CLERK_*` values reach the browser.
- Authorization runs in the page (`auth.protect()`). The UI `<Show>` blocks are cosmetic only.
- Never call `auth()`/`currentUser()` inside `'use cache'`.
- Admin and cron API routes must not accept a Clerk session in place of `x-skew-admin-secret` / `CRON_SECRET`.
- Don't print, read, or commit `.env.local`.

## Visual interpretation (UI parts)

- **Header:** no layout change for signed-out users. Signed-in users see a 36px circular avatar where **Login** was, aligned on the same baseline as **Subscribe** with the same `gap-2`. The mobile menu shows the same avatar in place of **Login**.
- **Auth pages:** `bg-surface` sheet with the wordmark centered about 48px above the card. The Clerk card uses the panel white background, a hairline `line` border, ink primary buttons, and Poppins. Side padding is 24px on mobile and the card is at most about 400px wide on desktop. No shadows beyond what the tokens already define.
- **Loading skeleton:** `bg-surface`, muted `panel-muted` rounded blocks. No spinner.

## Acceptance criteria

- Signed out: `/` renders and the header shows **Login**. Clicking it goes to `/sign-in`.
- Signed out: opening `/news/trump-iran` redirects to `/sign-in?redirect_url=…`. After sign-in, you land back on `/news/trump-iran`.
- Sign-up works at `/sign-up` and redirects to `/` afterwards.
- Signed in: the header shows `UserButton` (desktop and mobile menu), and sign-out from it returns you to a signed-out state.
- Signed in: `/news/trump-iran` renders the article. `/news/unknown` renders the existing not-found page.
- `npm run typecheck`, `npm run lint`, and `npm run build` all pass. The build reports no "uncached or runtime data during prerendering" errors.

## Checks to run

```
npm run typecheck
npm run lint
npm run build
```

(If a build fails on prerendering, rerun with `npx next build --debug-prerender` to list every failing route.)

## Manual test steps (after implementation)

1. Add these to `.env.local` (keep the existing Clerk keys):
   ```
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
   ```
2. Run `npm run dev` and open `http://localhost:3000`. Confirm **Login** shows in the header.
3. In a private window, open `http://localhost:3000/news/trump-iran`. You are sent to `/sign-in`.
4. Click "Sign up" on the card, create an account (in development the verification code for `+clerk_test` emails is `424242`), and confirm you land on `/`.
5. Confirm the avatar replaces **Login**. Narrow the window and open the menu to confirm the mobile avatar.
6. Open `/news/trump-iran`. The article renders.
7. Use the avatar menu and choose **Sign out**. Reopen `/news/trump-iran` and confirm you're redirected to sign-in, and that signing in brings you back to the story.
