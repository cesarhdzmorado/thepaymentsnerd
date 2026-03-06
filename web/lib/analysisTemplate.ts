import { render } from "@react-email/render";
import matter from "gray-matter";
import { marked } from "marked";
import { AnalysisEmail } from "@/emails/AnalysisEmail";

export interface AnalysisFrontmatter {
  title: string;
  subtitle?: string;
  date: string;
  subject: string;
}

/**
 * Parse a markdown analysis file into frontmatter + HTML body
 */
export function parseAnalysisMarkdown(raw: string): {
  frontmatter: AnalysisFrontmatter;
  bodyHtml: string;
} {
  const { data, content } = matter(raw);

  if (!data.title || !data.date || !data.subject) {
    throw new Error(
      "Analysis markdown must have frontmatter with: title, date, subject"
    );
  }

  const bodyHtml = marked.parse(content, { async: false }) as string;

  return {
    frontmatter: {
      title: data.title,
      subtitle: data.subtitle,
      date: data.date,
      subject: data.subject,
    },
    bodyHtml,
  };
}

/**
 * Render the analysis email template to HTML
 */
export async function generateAnalysisEmail({
  frontmatter,
  bodyHtml,
  unsubscribeUrl,
  referralCode,
}: {
  frontmatter: AnalysisFrontmatter;
  bodyHtml: string;
  unsubscribeUrl: string;
  referralCode: string;
}): Promise<string> {
  const formattedDate = new Date(`${frontmatter.date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const html = await render(
    AnalysisEmail({
      title: frontmatter.title,
      subtitle: frontmatter.subtitle,
      formattedDate,
      bodyHtml,
      unsubscribeUrl,
      referralCode,
    })
  );

  return html;
}
