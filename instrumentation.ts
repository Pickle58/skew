export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initPostHogLogs } = await import("./lib/posthog-logs");
    initPostHogLogs();
  }
}
