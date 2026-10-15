import { describe, expect, it } from "vitest";
import type { Newsletter } from "@/components/home/HomeSections";
import { escapeXml, isIssueDate, issueDescription, issuePath, issueTitle, issueUrl } from "./seo";

const newsletter: Newsletter = {
  publication_date: "2026-10-14",
  content: {
    news: [
      {
        title: "Bank of America faces record payments fine",
        body: "Regulators imposed a multi-agency penalty after finding material control failures.",
        source: { name: "FT", url: "https://example.com/story" },
      },
    ],
    curiosity: { text: "A sourced curiosity." },
  },
};

describe("SEO helpers", () => {
  it("accepts only real ISO issue dates", () => {
    expect(isIssueDate("2026-10-14")).toBe(true);
    expect(isIssueDate("2026-02-29")).toBe(false);
    expect(isIssueDate("14-10-2026")).toBe(false);
  });

  it("builds stable issue paths and URLs", () => {
    expect(issuePath("2026-10-14")).toBe("/issues/2026-10-14");
    expect(issueUrl("2026-10-14")).toBe("https://www.thepaymentsnerd.co/issues/2026-10-14");
  });

  it("derives distinct metadata from the lead story", () => {
    expect(issueTitle(newsletter)).toContain("Bank of America");
    expect(issueDescription(newsletter)).toContain("multi-agency penalty");
  });

  it("truncates descriptions and escapes feed content", () => {
    const longNewsletter = structuredClone(newsletter);
    longNewsletter.content.news[0].body = "x".repeat(200);
    expect(issueDescription(longNewsletter)).toHaveLength(158);
    expect(escapeXml("A & B < C \"quoted\"")).toBe("A &amp; B &lt; C &quot;quoted&quot;");
  });
});
