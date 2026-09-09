import { describe, it, expect } from "vitest";
import {
  addDaysIst,
  dayKey,
  distinctFYs,
  distinctMonths,
  fyEndDate,
  fyLabel,
  fyRange,
  fyStartDate,
  getAnchorDate,
  isoWeekKey,
  monthKey,
  priorPeriod,
  resolvePeriod,
} from "@/lib/dateRanges";
import type { MetaRow } from "@/types/sheet";

const meta = (m: Partial<MetaRow>): MetaRow => ({
  source: "x",
  status: "OK",
  data_as_of_ist: "2026-09-08 09:31 IST",
  rows: 1,
  note: "",
  ...m,
});

describe("getAnchorDate", () => {
  it("returns the latest data_as_of date across OK rows", () => {
    const rows = [
      meta({ source: "a", data_as_of_ist: "2026-09-07 09:31 IST" }),
      meta({ source: "b", data_as_of_ist: "2026-09-08 09:31 IST" }),
    ];
    expect(getAnchorDate(rows)).toBe("2026-09-08");
  });

  it("falls back to all rows if no OK rows exist", () => {
    const rows = [
      meta({ source: "a", status: "STALE", data_as_of_ist: "2026-09-05 09:31 IST" }),
    ];
    expect(getAnchorDate(rows)).toBe("2026-09-05");
  });

  it("throws if meta is empty", () => {
    expect(() => getAnchorDate([])).toThrow();
  });
});

describe("resolvePeriod", () => {
  it("last7: 6 days back inclusive", () => {
    expect(resolvePeriod({ kind: "last7" }, "2026-09-08")).toEqual({
      from: "2026-09-02",
      to: "2026-09-08",
    });
  });

  it("last30: 29 days back inclusive", () => {
    expect(resolvePeriod({ kind: "last30" }, "2026-09-08")).toEqual({
      from: "2026-08-10",
      to: "2026-09-08",
    });
  });

  it("thisMonth: first-of-month through anchor", () => {
    expect(resolvePeriod({ kind: "thisMonth" }, "2026-09-08")).toEqual({
      from: "2026-09-01",
      to: "2026-09-08",
    });
  });

  it("custom: echoes", () => {
    expect(
      resolvePeriod(
        { kind: "custom", from: "2026-01-01", to: "2026-01-31" },
        "2026-09-08",
      ),
    ).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });
});

describe("priorPeriod", () => {
  it("returns an equal-length window immediately preceding", () => {
    const prior = priorPeriod({ from: "2026-09-02", to: "2026-09-08" });
    expect(prior).toEqual({ from: "2026-08-26", to: "2026-09-01" });
  });
});

describe("isoWeekKey", () => {
  it("Monday is the start of the ISO week", () => {
    expect(isoWeekKey("2026-09-07")).toBe("2026-W37");
    expect(isoWeekKey("2026-09-08")).toBe("2026-W37");
    expect(isoWeekKey("2026-09-13")).toBe("2026-W37");
    expect(isoWeekKey("2026-09-14")).toBe("2026-W38");
  });
});

describe("monthKey / dayKey", () => {
  it("trims to YYYY-MM", () => {
    expect(monthKey("2026-09-08")).toBe("2026-09");
  });
  it("echoes day", () => {
    expect(dayKey("2026-09-08")).toBe("2026-09-08");
  });
});

describe("addDaysIst", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysIst("2026-08-30", 3)).toBe("2026-09-02");
  });
  it("subtracts days with negative n", () => {
    expect(addDaysIst("2026-09-02", -3)).toBe("2026-08-30");
  });
});

describe("fyLabel / fyRange / distinctFYs / distinctMonths", () => {
  it("FY 25-26 covers Apr 2025 → Mar 2026", () => {
    expect(fyLabel("2025-04-01")).toBe("FY 25-26");
    expect(fyLabel("2025-12-31")).toBe("FY 25-26");
    expect(fyLabel("2026-01-01")).toBe("FY 25-26");
    expect(fyLabel("2026-03-31")).toBe("FY 25-26");
    expect(fyLabel("2026-04-01")).toBe("FY 26-27");
    expect(fyLabel("2024-04-15")).toBe("FY 24-25");
  });
  it("fyStartDate / fyEndDate span Apr-Mar", () => {
    expect(fyStartDate(2025)).toBe("2025-04-01");
    expect(fyEndDate(2025)).toBe("2026-03-31");
  });
  it("fyRange returns the correct window", () => {
    expect(fyRange(2025)).toEqual({
      from: "2025-04-01",
      to: "2026-03-31",
    });
  });
  it("distinctFYs collects unique start years", () => {
    const rows = [
      { order_date_ist: "2024-06-01" }, // FY 24-25
      { order_date_ist: "2025-01-01" }, // FY 24-25
      { order_date_ist: "2025-06-01" }, // FY 25-26
      { order_date_ist: "2026-02-01" }, // FY 25-26
      { order_date_ist: "2026-09-09" }, // FY 26-27
    ];
    expect(distinctFYs(rows)).toEqual([2024, 2025, 2026]);
  });
  it("distinctMonths collects unique YYYY-MM in order", () => {
    const rows = [
      { order_date_ist: "2025-08-15" },
      { order_date_ist: "2025-09-03" },
      { order_date_ist: "2025-08-30" },
      { order_date_ist: "2026-01-05" },
    ];
    expect(distinctMonths(rows)).toEqual(["2025-08", "2025-09", "2026-01"]);
  });
});
