import { describe, expect, it } from "vitest";
import { matchesRejectList } from "@/lib/parsing/reject-list";

describe("matchesRejectList", () => {
  it("rejects category and live paths", () => {
    expect(matchesRejectList("/sections/politics")).toBe("reject_category");
    expect(matchesRejectList("/world/live-updates")).toBe("reject_live");
  });

  it("allows article-like paths", () => {
    expect(matchesRejectList("/world/2024/01/01/long-story-slug")).toBeNull();
  });
});
