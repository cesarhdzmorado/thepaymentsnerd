import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomePage, { getNewsletterByDate } from "@/app/page";
import { StructuredData } from "@/components/StructuredData";
import { isIssueDate, issueDescription, issuePath, issueTitle, issueUrl } from "@/lib/seo";
import { breadcrumbJsonLd, issueArticleJsonLd } from "@/lib/structuredData";

export const revalidate = 900;

type IssuePageProps = {
  params: Promise<{ date: string }>;
};

export async function generateMetadata({ params }: IssuePageProps): Promise<Metadata> {
  const { date } = await params;
  if (!isIssueDate(date)) return { robots: { index: false, follow: false } };

  const newsletter = await getNewsletterByDate(date);
  if (!newsletter) return { robots: { index: false, follow: false } };

  const title = issueTitle(newsletter);
  const description = issueDescription(newsletter);
  const canonical = issuePath(date);
  const socialImage = `${issueUrl(date)}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: issueUrl(date),
      siteName: "/thepaymentsnerd",
      publishedTime: `${date}T07:00:00Z`,
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function IssuePage({ params }: IssuePageProps) {
  const { date } = await params;
  if (!isIssueDate(date)) notFound();
  const newsletter = await getNewsletterByDate(date);
  if (!newsletter) notFound();

  return (
    <>
      <StructuredData
        data={[
          issueArticleJsonLd(newsletter),
          breadcrumbJsonLd([
            { name: "Home", url: "https://www.thepaymentsnerd.co" },
            { name: "Archive", url: "https://www.thepaymentsnerd.co/archive" },
            { name: date, url: issueUrl(date) },
          ]),
        ]}
      />
      {await HomePage({ searchParams: Promise.resolve({ date }) })}
    </>
  );
}
