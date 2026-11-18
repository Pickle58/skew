import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getCronSecret } from "@/lib/env/server";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isAuthorizedCronRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const expected = getCronSecret();
  if (!expected) {
    console.warn("[auth] CRON_SECRET is not set; rejecting cron request");
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const provided = header.slice("Bearer ".length);
  if (!provided) {
    return false;
  }

  return timingSafeEqual(digest(provided), digest(expected));
}
