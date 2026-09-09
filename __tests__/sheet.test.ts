import { describe, it, expect } from "vitest";
import { computeFreshness, staleReason, todayIst } from "@/lib/freshness";
import type { FreshnessInput } from "@/lib/freshness";

function snap(over: Partial<FreshnessInput>): FreshnessInput {
  const base: FreshnessInput = {
    ok: true,
    fetchedAtIso: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    data: { _meta: [] },
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
    expect(staleReason(snap({ ok: false, fetchedAtIso: new Date().toISOString() }))).toBe(
      "fetch-failed",
    );
  });
  it("data-source-not-ok when any meta row is not OK", () => {
    expect(
      staleReason(
        snap({
          data: {
            _meta: [
              {
                source: "x",
                status: "STALE",
                data_as_of_ist: "2026-09-08 09:31 IST",
                rows: 1,
                note: "",
              },
            ],
          },
        }),
      ),
    ).toBe("data-source-not-ok");
  });
  it("snapshot-too-old when fetched more than 6h ago", () => {
    expect(
      staleReason(snap({ fetchedAtIso: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() })),
    ).toBe("snapshot-too-old");
  });
  it("fresh when ok, all sources OK, and <6h old", () => {
    expect(
      staleReason(
        snap({
          fetchedAtIso: new Date(Date.now() - 60 * 1000).toISOString(),
          data: {
            _meta: [
              {
                source: "x",
                status: "OK",
                data_as_of_ist: "2026-09-08 09:31 IST",
                rows: 1,
                note: "",
              },
            ],
          },
        }),
      ),
    ).toBe("fresh");
  });
});

describe("todayIst", () => {
  it("returns an IST date even when now() is UTC morning", () => {
    const fixed = new Date("2026-09-09T00:30:00Z");
    const ist = todayIst(fixed);
    expect(ist).toMatch(/^2026-09-0[89]$/);
  });
});

describe("computeFreshness", () => {
  it("flags sourceFailed=true with the failing rows", () => {
    const r = computeFreshness(
      snap({
        data: {
          _meta: [
            { source: "af_daily", status: "STALE", data_as_of_ist: "2026-09-08 09:31 IST", rows: 1, note: "old" },
            { source: "mb_orders", status: "OK", data_as_of_ist: "2026-09-08 09:31 IST", rows: 1, note: "" },
          ],
        },
      }),
    );
    expect(r.sourceFailed).toBe(true);
    expect(r.failedSources.map((m) => m.source)).toEqual(["af_daily"]);
  });

  it("flags isBehindSchedule when anchor < today-1 IST", () => {
    const fixedNow = Date.UTC(2026, 8, 9, 3, 0, 0);
    const r = computeFreshness(
      snap({
        ok: true,
        fetchedAtIso: new Date(fixedNow - 60_000).toISOString(),
        data: {
          _meta: [
            { source: "x", status: "OK", data_as_of_ist: "2026-09-06 09:31 IST", rows: 1, note: "" },
          ],
        },
      }),
      fixedNow,
      "2026-09-09",
    );
    expect(r.isBehindSchedule).toBe(true);
    expect(r.anchorDate).toBe("2026-09-06");
    expect(r.expectedThrough).toBe("2026-09-08");
  });

  it("does NOT flag isBehindSchedule when anchor == today-1 IST", () => {
    const fixedNow = Date.UTC(2026, 8, 9, 3, 0, 0);
    const r = computeFreshness(
      snap({
        ok: true,
        fetchedAtIso: new Date(fixedNow - 60_000).toISOString(),
        data: {
          _meta: [
            { source: "x", status: "OK", data_as_of_ist: "2026-09-08 09:31 IST", rows: 1, note: "" },
          ],
        },
      }),
      fixedNow,
      "2026-09-09",
    );
    expect(r.isBehindSchedule).toBe(false);
    expect(r.anchorDate).toBe("2026-09-08");
  });

  it("fresh when source OK and anchor == today-1 IST", () => {
    const fixedNow = Date.UTC(2026, 8, 9, 3, 0, 0);
    const r = computeFreshness(
      snap({
        ok: true,
        fetchedAtIso: new Date(fixedNow - 60_000).toISOString(),
        data: {
          _meta: [
            { source: "x", status: "OK", data_as_of_ist: "2026-09-08 09:31 IST", rows: 1, note: "" },
          ],
        },
      }),
      fixedNow,
      "2026-09-09",
    );
    expect(r.staleReason).toBe("fresh");
    expect(r.isBehindSchedule).toBe(false);
    expect(r.sourceFailed).toBe(false);
  });

  it("source failure ranks above behind-schedule in staleReason", () => {
    const fixedNow = Date.UTC(2026, 8, 9, 3, 0, 0);
    const r = computeFreshness(
      snap({
        ok: true,
        fetchedAtIso: new Date(fixedNow - 60_000).toISOString(),
        data: {
          _meta: [
            { source: "x", status: "STALE", data_as_of_ist: "2026-09-06 09:31 IST", rows: 1, note: "fail" },
          ],
        },
      }),
      fixedNow,
      "2026-09-09",
    );
    expect(r.sourceFailed).toBe(true);
    expect(r.isBehindSchedule).toBe(true);
    expect(r.staleReason).toBe("data-source-not-ok");
  });
});
