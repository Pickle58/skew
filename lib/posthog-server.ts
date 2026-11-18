import "server-only";
import { PostHog } from "posthog-node";

let posthogClient: PostHog | null | undefined;

export function getPostHogClient(): PostHog | null {
  if (posthogClient !== undefined) {
    return posthogClient;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured",
      );
    }
    posthogClient = null;
    return posthogClient;
  }

  if (!host) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
      );
    }
    posthogClient = null;
    return posthogClient;
  }

  posthogClient = new PostHog(apiKey, {
    host,
    enableExceptionAutocapture: true,
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 2000,
    fetchRetryCount: 0,
  });
  return posthogClient;
}
