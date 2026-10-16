import type { Newsletter } from "@/components/home/HomeSections";
import { issueDescription, issueTitle, issueUrl, SITE_URL } from "./seo";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export type JsonLdValue = Record<string, unknown>;

export function organizationJsonLd(): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "/thepaymentsnerd",
    url: SITE_URL,
    logo: `${SITE_URL}/apple-touch-icon.png`,
    email: "cesar@thepaymentsnerd.co",
    description: "A daily, source-linked briefing for payments professionals.",
  };
}

export function websiteJsonLd(): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "/thepaymentsnerd",
    url: SITE_URL,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function issueArticleJsonLd(newsletter: Newsletter): JsonLdValue {
  const url = issueUrl(newsletter.publication_date);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}/#article`,
    headline: issueTitle(newsletter),
    description: issueDescription(newsletter),
    datePublished: `${newsletter.publication_date}T07:00:00Z`,
    dateModified: `${newsletter.publication_date}T07:00:00Z`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: `${url}/opengraph-image`,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    isPartOf: { "@id": WEBSITE_ID },
    about: [
      { "@type": "Thing", name: "payments" },
      { "@type": "Thing", name: "fintech" },
      { "@type": "Thing", name: "financial services" },
    ],
  };
}

export function collectionPageJsonLd(
  name: string,
  url: string,
  issues: Array<{ publication_date: string; title?: string }>,
): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}/#collection`,
    name,
    url,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: issues.map((issue, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: issue.title ?? `Issue published ${issue.publication_date}`,
        url: issueUrl(issue.publication_date),
      })),
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webPageJsonLd(
  type: "AboutPage" | "WebPage",
  name: string,
  url: string,
  description: string,
): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}/#page`,
    name,
    url,
    description,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}
