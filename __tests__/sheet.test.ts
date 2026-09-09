import { describe, it, expect } from "vitest";
import { isAnchoredToYesterday, staleReason } from "@/lib/freshness";
import type { FreshnessInput } from "@/lib/freshness";

function snap(over: Partial<FreshnessInput> & { metaAsOf?: string[]; data?: any }): FreshnessInput {
  const base: FreshnessInput = {
    ok: true,
    fetchedAtIso: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    data: {
      _meta: [],
    },
  };
  return { ...base, ...over };
}

describe("staleReason", () => {
  it("never-fetched for epoch timestamp", () => {
    expect(staleReason(snap({ fetchedAtIso: "1970-01-01T00:00:00.000Z" }))).toBe(
      "never-fetched",
    );
  });

  it("fetch-failed when snap.ok is false", () => {
    expect(
      staleReason(
        snap({ ok: false, fetchedAtIso: new Date().toISOString() }),
      ),
    ).toBe("fetch-failed");
  });

  it("data-source-not-ok when any meta row is not OK", () => {
    expect(
      staleReason(
        snap({
          data: {
            ...snap({}).data,
            _meta: [{ source: "x", status: "STALE", data_as_of_ist: "2026-09-08 09:31 IST", rows: 1, note: "" }],
          },
        }),
      ),
    ).toBe("data-source-not-ok");
  });

  it("snapshot-too-old when fetched more than 6h ago", () => {
    expect(
      staleReason(
        snap({
          fetchedAtIso: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        }),
      ),
    ).toBe("snapshot-too-old");
  });

  it("fresh when ok, all sources OK, and <6h old", () => {
    expect(
      staleReason(
        snap({
          fetchedAtIso: new Date(Date.now() - 60 * 1000).toISOString(),
          data: { ...snap({}).data, _meta: [{ source: "x", status: "OK", data_as_of_ist: "2026-09-08 09:31 IST", rows: 1, note: "" }] },
        }),
      ),
    ).toBe("fresh");
  });
});

describe("isAnchoredToYesterday", () => {
  it("true when metaAsOf >= today-1", () => {
    expect(isAnchoredToYesterday(["2026-09-08"], "2026-09-09")).toBe(true);
  });

  it("false when metaAsOf is older than today-1", () => {
    expect(isAnchoredToYesterday(["2026-09-06"], "2026-09-09")).toBe(false);
  });

  it("false when metaAsOf is empty", () => {
    expect(isAnchoredToYesterday([], "2026-09-09")).toBe(false);
  });

  it("true when metaAsOf equals today-1 exactly", () => {
    expect(isAnchoredToYesterday(["2026-09-08"], "2026-09-09")).toBe(true);
  });
});
