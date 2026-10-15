import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomePage, { getNewsletterByDate } from "@/app/page";
import { isIssueDate, issueDescription, issuePath, issueTitle, issueUrl } from "@/lib/seo";

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
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function IssuePage({ params }: IssuePageProps) {
  const { date } = await params;
  if (!isIssueDate(date) || !(await getNewsletterByDate(date))) notFound();

  return HomePage({ searchParams: Promise.resolve({ date }) });
}
