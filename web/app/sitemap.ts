import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabaseClient";
import { issueUrl, SITE_URL } from "@/lib/seo";

export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await supabase
    .from("newsletters")
    .select("publication_date")
    .order("publication_date", { ascending: false })
    .limit(5000);

  if (error) throw new Error(`Unable to generate sitemap: ${error.message}`);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/archive`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/methodology`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const issues: MetadataRoute.Sitemap = (data ?? []).map(({ publication_date }) => ({
    url: issueUrl(publication_date),
    lastModified: new Date(`${publication_date}T07:00:00Z`),
    changeFrequency: "never",
    priority: 0.7,
  }));

  const monthUrls: MetadataRoute.Sitemap = [
    ...new Set((data ?? []).map(({ publication_date }) => publication_date.slice(0, 7))),
  ].map((monthKey) => {
    const [year, month] = monthKey.split("-");
    return {
      url: `${SITE_URL}/archive/${year}/${month}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    };
  });

  return [...staticPages, ...monthUrls, ...issues];
}
