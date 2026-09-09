import "server-only";
import type { SheetData } from "@/types/sheet";

const FETCH_TIMEOUT_MS = 15_000;

export async function getSheetData(): Promise<SheetData> {
  const url = `${process.env.SHEET_API_URL}?token=${process.env.SHEET_API_TOKEN}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      next: { revalidate: 600 },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Sheet API returned ${res.status}`);
    const data = (await res.json()) as { error?: string } & Partial<SheetData>;
    if (data.error) throw new Error(`Sheet API: ${data.error}`);
    if (!data._meta || !Array.isArray(data._meta)) {
      throw new Error("Sheet API: response missing _meta");
    }
    if (!Array.isArray(data.mb_orders)) {
      throw new Error("Sheet API: response missing mb_orders");
    }
    return data as SheetData;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Sheet API timed out after ${FETCH_TIMEOUT_MS / 1000}s — check SHEET_API_URL and that the Apps Script is deployed & accessible`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
