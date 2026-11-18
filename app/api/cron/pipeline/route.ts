import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";
import { runCronPipeline } from "@/lib/pipeline/cron";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runCronPipeline();
    return Response.json(summary);
  } catch (error) {
    console.error("[cron] unexpected failure:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Cron pipeline failed" }, { status: 500 });
  }
}
