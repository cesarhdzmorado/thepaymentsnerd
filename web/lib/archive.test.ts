import { describe, expect, it } from "vitest";
import { formatIssueDate, isArchiveMonth, monthBounds } from "./archive";

describe("archive helpers", () => {
  it("formats issue dates without local-time drift", () => {
    expect(formatIssueDate("2026-10-01")).toMatchObject({
      monthKey: "2026-10",
      monthLabel: "October 2026",
      monthShort: "OCT",
      day: "01",
    });
  });

  it("validates archive month parameters", () => {
    expect(isArchiveMonth("2026", "01")).toBe(true);
    expect(isArchiveMonth("2026", "12")).toBe(true);
    expect(isArchiveMonth("2026", "13")).toBe(false);
    expect(isArchiveMonth("26", "10")).toBe(false);
  });

  it("calculates exclusive month bounds across year end", () => {
    expect(monthBounds("2026", "12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});
