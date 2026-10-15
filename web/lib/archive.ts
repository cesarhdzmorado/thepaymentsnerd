export function formatIssueDate(isoDate: string): { monthKey: string; monthLabel: string; monthShort: string; weekday: string; day: string } {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return {
    monthKey: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    monthLabel: date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    monthShort: date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase(),
    weekday: date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
}

export function isArchiveMonth(year: string, month: string): boolean {
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) return false;
  const monthNumber = Number(month);
  return monthNumber >= 1 && monthNumber <= 12;
}

export function monthBounds(year: string, month: string): { start: string; end: string } {
  const start = `${year}-${month}-01`;
  const end = new Date(Date.UTC(Number(year), Number(month), 1)).toISOString().slice(0, 10);
  return { start, end };
}
