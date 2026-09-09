import "server-only";
import type { SheetData } from "@/types/sheet";

export async function getSheetData(): Promise<SheetData> {
  const url = `${process.env.SHEET_API_URL}?token=${process.env.SHEET_API_TOKEN}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`Sheet API returned ${res.status}`);
  const data = (await res.json()) as { error?: string } & Partial<SheetData>;
  if (data.error) throw new Error(`Sheet API: ${data.error}`);
  return data as SheetData;
}
