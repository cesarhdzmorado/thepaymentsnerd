import { describe, expect, it } from "vitest";
import type { Newsletter } from "@/components/home/HomeSections";
import { breadcrumbJsonLd, collectionPageJsonLd, issueArticleJsonLd, organizationJsonLd, websiteJsonLd } from "./structuredData";

const newsletter: Newsletter = {
  publication_date: "2026-10-15",
  content: {
    news: [{ title: "A payments headline", body: "A sourced summary.", source: { name: "Source", url: "https://example.com" } }],
    curiosity: { text: "Fact" },
  },
};

describe("structured data", () => {
  it("links the organisation, website, and issue graph", () => {
    expect(organizationJsonLd()["@id"]).toBe("https://www.thepaymentsnerd.co/#organization");
    expect(websiteJsonLd().publisher).toEqual({ "@id": "https://www.thepaymentsnerd.co/#organization" });
    expect(issueArticleJsonLd(newsletter)).toMatchObject({
      "@type": "Article",
      datePublished: "2026-10-15T07:00:00Z",
      mainEntityOfPage: { "@id": "https://www.thepaymentsnerd.co/issues/2026-10-15" },
      author: {
        "@id": "https://www.thepaymentsnerd.co/#editorial-desk",
        parentOrganization: { "@id": "https://www.thepaymentsnerd.co/#organization" },
      },
    });
  });

  it("builds ordered collection and breadcrumb lists", () => {
    const collection = collectionPageJsonLd("Archive", "https://www.thepaymentsnerd.co/archive", [
      { publication_date: "2026-10-15", title: "Issue title" },
    ]);
    expect(collection.mainEntity).toMatchObject({ itemListElement: [{ position: 1 }] });
    expect(breadcrumbJsonLd([{ name: "Home", url: "https://www.thepaymentsnerd.co" }])).toMatchObject({
      itemListElement: [{ position: 1, name: "Home" }],
    });
  });
});
