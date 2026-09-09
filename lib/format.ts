const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const intFormatter = new Intl.NumberFormat("en-IN");

export function inr(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return inrFormatter.format(n);
}

export function intFmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return intFormatter.format(n);
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function deltaStr(
  curr: number,
  prev: number,
  digits = 1,
): { text: string; tone: "up" | "down" | "flat" } | null {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0)
    return null;
  const change = (curr - prev) / Math.abs(prev);
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "•";
  const tone = change > 0 ? "up" : change < 0 ? "down" : "flat";
  return {
    text: `${sign}${(Math.abs(change) * 100).toFixed(digits)}% ${arrow}`,
    tone,
  };
}
