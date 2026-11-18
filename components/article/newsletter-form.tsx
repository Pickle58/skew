"use client";

import type { FormEvent } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    posthog.capture("newsletter_subscribed", {
      location: "article_details",
    });
  }

  return (
    <form
      className="mt-10 flex flex-col gap-4 rounded-lg border border-line bg-panel p-6 sm:flex-row sm:items-center sm:justify-between"
      onSubmit={handleSubmit}
    >
      <div className="max-w-md">
        <h2 className="text-[20px] font-semibold leading-[1.3] text-ink">Stay Informed. Stay Balanced.</h2>
        <p className="mt-1 text-[13px] leading-[1.6] text-muted">
          Get the top stories and bias analysis delivered to your inbox.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <input
          type="email"
          name="email"
          aria-label="Email"
          placeholder="Enter your email"
          autoComplete="email"
          className="h-9 w-full rounded-full border border-line bg-panel px-4 text-[14px] text-ink placeholder:text-muted sm:w-64"
        />
        <Button size="header" type="submit">
          Subscribe
        </Button>
      </div>
    </form>
  );
}
