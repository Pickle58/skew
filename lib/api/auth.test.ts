import { afterEach, describe, expect, it } from "vitest";
import { ADMIN_SECRET_HEADER, isAuthorizedAdminRequest } from "@/lib/api/admin-auth";
import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";

const ORIGINAL_ENV = { ...process.env };

function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
});

describe("isAuthorizedAdminRequest", () => {
  it("rejects missing or short secrets", () => {
    setEnv("SKEW_ADMIN_SECRET", "short");
    const request = new Request("http://localhost/api/logs", {
      headers: { [ADMIN_SECRET_HEADER]: "short" },
    });
    expect(isAuthorizedAdminRequest(request)).toBe(false);
  });

  it("accepts matching long secrets", () => {
    setEnv("SKEW_ADMIN_SECRET", "1234567890abcdef");
    const request = new Request("http://localhost/api/logs", {
      headers: { [ADMIN_SECRET_HEADER]: "1234567890abcdef" },
    });
    expect(isAuthorizedAdminRequest(request)).toBe(true);
  });
});

describe("isAuthorizedCronRequest", () => {
  it("allows insecure cron only in development with flag", () => {
    setEnv("NODE_ENV", "development");
    setEnv("ALLOW_INSECURE_CRON", "1");
    setEnv("CRON_SECRET", undefined);
    expect(isAuthorizedCronRequest(new Request("http://localhost/api/cron/pipeline"))).toBe(true);
  });

  it("rejects development without insecure flag when secret missing", () => {
    setEnv("NODE_ENV", "development");
    setEnv("ALLOW_INSECURE_CRON", undefined);
    setEnv("CRON_SECRET", undefined);
    expect(isAuthorizedCronRequest(new Request("http://localhost/api/cron/pipeline"))).toBe(false);
  });

  it("accepts bearer cron secret", () => {
    setEnv("NODE_ENV", "production");
    setEnv("ALLOW_INSECURE_CRON", undefined);
    setEnv("CRON_SECRET", "cron-secret-value");
    const request = new Request("http://localhost/api/cron/pipeline", {
      headers: { authorization: "Bearer cron-secret-value" },
    });
    expect(isAuthorizedCronRequest(request)).toBe(true);
  });
});
