# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

News readers. They open Skew to read real articles with AI-estimated sentiment and political framing beside the story.

## Product Purpose

Skew collects real news articles from configured sources, analyzes them with AI, stores them in Supabase, and shows reader-friendly sentiment and framing insights. Success is a reader who can see what an article says and how it is framed, without the interface scraping, analyzing, or changing pipeline state.

## Positioning

Framing is shown as an AI estimate: left, center, and right shares that sum to 100, with an explicit disclaimer that the estimate is not objective truth. The product line is balanced news coverage, powered by AI.

## Operating Context

Readers use the website. Article data, analysis, and source configuration live in Supabase. Scraping, scheduling, and analysis run on the server, not in the browser.

## Capabilities and Constraints

Confirmed product surface, not all of it built yet:

- Home page with news cards
- News details page with the full stored analysis
- Clerk authentication
- Supabase persistence
- Server-side scraping, scheduling, AI analysis, logs, and related-article search

The interface displays stored data only. It must not expose service credentials or call scraping, analysis, or scheduler code from the browser.

The app currently has no articles, sources, or auth wired up. Those stay out of scope until their own work.

## Brand Commitments

- The product name is Skew. The wordmark uses that name, with a smaller “News” mark beside it, in the lockup from the design-system board.
- Tagline: Balanced news coverage, powered by AI.
- Closing line: Stay consistent. Stay unbiased.
- The design-system board supplied with this work is the binding visual reference. Match it, with the wordmark reading Skew. Do not invent a replacement look.

## Evidence on Hand

- Product behavior is specified in `AGENTS.md`.
- The visual reference is the attached design-system board.
- The board’s article card is specimen copy from that reference, not a live stored article. There is no article catalog in the app yet.

## Product Principles

- Show stored analysis, and label political framing as AI-estimated.
- Prefer a clear reading of one article over extra interface.
- Keep pipeline work on the server.
- Do not invent articles, sources, customers, or metrics the product does not have.
