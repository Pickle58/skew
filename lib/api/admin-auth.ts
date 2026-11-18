import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getAdminSecret } from "@/lib/env/server";

export const ADMIN_SECRET_HEADER = "x-skew-admin-secret";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isAuthorizedAdminRequest(request: Request): boolean {
  const expected = getAdminSecret();
  if (!expected) {
    console.warn("[auth] SKEW_ADMIN_SECRET is not set; rejecting admin request");
    return false;
  }

  const provided = request.headers.get(ADMIN_SECRET_HEADER);
  if (!provided) {
    return false;
  }
  return timingSafeEqual(digest(provided), digest(expected));
}
