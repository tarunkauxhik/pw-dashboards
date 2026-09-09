import { describe, it, expect } from "vitest";
import { deltaStr, inr, intFmt, pct } from "@/lib/format";

describe("inr", () => {
  it("uses Indian rupee grouping", () => {
    expect(inr(1234567)).toMatch(/12,34,567/);
  });
  it("returns em dash for null/undefined/NaN", () => {
    expect(inr(null)).toBe("—");
    expect(inr(undefined)).toBe("—");
    expect(inr(Number.NaN)).toBe("—");
  });
});

describe("intFmt", () => {
  it("groups as en-IN", () => {
    expect(intFmt(1234567)).toBe("12,34,567");
  });
});

describe("pct", () => {
  it("formats ratio with one decimal", () => {
    expect(pct(0.123)).toBe("12.3%");
  });
});

describe("deltaStr", () => {
  it("returns null when prev is zero", () => {
    expect(deltaStr(5, 0)).toBeNull();
  });
  it("returns positive tone when curr > prev", () => {
    const d = deltaStr(120, 100);
    expect(d?.tone).toBe("up");
    expect(d?.text).toMatch(/\+20\.0%/);
  });
  it("returns negative tone when curr < prev", () => {
    const d = deltaStr(80, 100);
    expect(d?.tone).toBe("down");
    expect(d?.text).toMatch(/−20\.0%/);
  });
});
