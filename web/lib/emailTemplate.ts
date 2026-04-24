import { render } from "@react-email/render";
import DailyNewsletter from "@/emails/DailyNewsletter";
import { ensureHttps } from "./publicationNames";
import OpenAI from "openai";

interface Source {
  name: string;
  url: string;
}

interface NewsItem {
  title: string;
  body: string;
  source: Source;
}

interface Curiosity {
  text: string;
  source?: Source;  // Source is now optional for creative curiosity facts
}

interface WhatsHotItem {
  flag: string;
  type: "fundraising" | "product" | "M&A" | "expansion";
  company: string;
  description: string;
  source_url?: string;
}

interface Sponsor {
  name: string;
  url: string;
  logoUrl?: string;
}

interface DailyNewsletterParams {
  publicationDate: string;
  news: NewsItem[];
  perspective?: string;  // Editorial lens/setup - "What Matters Today"
  curiosity: Curiosity;
  whatsHot?: WhatsHotItem[];  // Funding, M&A & Product Launches
  unsubscribeUrl: string;
  referralCode: string;
  sponsor?: Sponsor;
}

/**
 * Generate a compelling subject line from newsletter content using AI
 * Format: "🤓 [Creative title based on lead story]"
 */
export async function generateEmailSubject(news: NewsItem[]): Promise<string> {
  if (!news || news.length === 0) {
    return "🤓 Today's Payment Intelligence";
  }

  // Get the lead story
  const leadStory = news[0];

  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate a creative, clever title based on the lead story
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a creative email subject line writer for /thepaymentsnerd, a payments industry newsletter.
Your task is to create a clever, punchy subject line based on the lead story.

Requirements:
- Maximum 10 words (not including the emoji prefix)
- Make it clever, intriguing, or thought-provoking
- Focus on the key insight or implication, not just the headline
- Use active, punchy language
- Avoid generic business jargon
- Make readers curious to open the email

Examples of good approaches:
- Highlight a surprising angle or implication
- Use a clever turn of phrase
- Create intrigue about what's changing
- Focus on the "so what" rather than the "what"

Return ONLY the subject line text (without the emoji prefix, as that will be added automatically).`
        },
        {
          role: "user",
          content: `Create a clever ~10 word subject line for this story:

Title: ${leadStory.title}

Summary: ${leadStory.body}

Return only the subject line text, no quotes or additional formatting.`
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const choice = completion.choices[0];
    const rawTitle = choice?.message?.content?.trim() ?? "";
    // If the model hit the token cap, its output is cut mid-sentence — don't ship it.
    const wasTruncated = choice?.finish_reason === "length";
    // Strip wrapping quotes / "Subject:" prefix the model sometimes adds despite instructions.
    const cleanedTitle = rawTitle
      .replace(/^subject:\s*/i, "")
      .replace(/^["'“”‘’]([\s\S]*)["'“”‘’]$/, "$1")
      .trim();

    const creativeTitle = !wasTruncated && cleanedTitle ? cleanedTitle : leadStory.title;

    return `🤓 ${creativeTitle}`;
  } catch (error) {
    console.error("Error generating creative email subject:", error);
    return `🤓 ${leadStory.title}`;
  }
}

export async function generateDailyNewsletterEmail({
  publicationDate,
  news,
  perspective,
  curiosity,
  whatsHot,
  unsubscribeUrl,
  referralCode,
  sponsor,
}: DailyNewsletterParams): Promise<string> {
  const formattedDate = new Date(`${publicationDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Ensure sources have https
  const processedNews = news.map((item, index) => {
    // Debug logging
    if (typeof item.source !== 'object' || !item.source) {
      console.error(`Invalid source at news item ${index}:`, item.source);
      throw new Error(`News item ${index} has invalid source format. Expected object with name and url, got: ${typeof item.source}`);
    }
    if (typeof item.source.url !== 'string') {
      console.error(`Invalid source.url at news item ${index}:`, item.source);
      throw new Error(`News item ${index} has invalid source.url. Expected string, got: ${typeof item.source.url}`);
    }

    return {
      ...item,
      source: {
        name: item.source.name,
        url: ensureHttps(item.source.url),
      },
    };
  });

  // Process curiosity - source is now optional
  const processedCuriosity: Curiosity = {
    text: curiosity.text,
  };

  // Only add source if it exists and is valid
  if (curiosity.source && typeof curiosity.source === 'object' && typeof curiosity.source.url === 'string') {
    processedCuriosity.source = {
      name: curiosity.source.name,
      url: ensureHttps(curiosity.source.url),
    };
  }

  // Render React Email component to HTML string
  const html = await render(
    DailyNewsletter({
      formattedDate,
      perspective,
      news: processedNews,
      curiosity: processedCuriosity,
      whatsHot,
      unsubscribeUrl,
      referralCode,
      sponsor,
    })
  );

  return html;
}
