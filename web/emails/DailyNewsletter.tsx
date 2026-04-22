import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Heading,
  Hr,
} from "@react-email/components";
import { groupWhatsHotByRegion, type WhatsHotItem } from "@/lib/regions";
import { emailDarkModeCss } from "./darkMode";

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

interface Sponsor {
  name: string;
  url: string;
  logoUrl?: string;
}

interface DailyNewsletterProps {
  formattedDate: string;
  perspective?: string;
  news: NewsItem[];
  curiosity: Curiosity;
  whatsHot?: WhatsHotItem[];
  unsubscribeUrl: string;
  referralCode: string;
  sponsor?: Sponsor;
}

export function DailyNewsletter({
  formattedDate,
  perspective,
  news,
  curiosity,
  whatsHot,
  unsubscribeUrl,
  referralCode,
  sponsor,
}: DailyNewsletterProps) {
  const heroStory = news[0];
  const quickHits = news.slice(1);

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{emailDarkModeCss}</style>
      </Head>
      <Preview>
        Five critical payments insights. Zero noise. Daily.
      </Preview>
      <Body style={main} className="email-body">
        <Container style={container} className="email-container">
          {/* Header */}
          <Section style={header}>
            <Heading style={logoHeading} className="text-heading">/thepaymentsnerd</Heading>
            <Text style={dateText} className="text-muted">{formattedDate}</Text>
            <Text style={{ margin: "8px 0 0 0" }}>
              <Link href="https://www.thepaymentsnerd.co" style={viewOnlineLink} className="link-primary">
                View Online
              </Link>
            </Text>
          </Section>

          {/* Presented by Sponsor */}
          {sponsor && (
            <>
              <Section style={sponsorSection}>
                <Text style={sponsorLabel} className="text-subtle">PRESENTED BY</Text>
                {sponsor.logoUrl ? (
                  <Link href={sponsor.url} style={sponsorLogoLink}>
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      style={sponsorLogo}
                    />
                  </Link>
                ) : (
                  <Link href={sponsor.url} style={sponsorNameLink} className="text-heading">
                    {sponsor.name}
                  </Link>
                )}
              </Section>
              <Hr style={divider} className="email-divider" />
            </>
          )}

          {/* What Matters Today */}
          {perspective && (
            <>
              <Section style={section}>
                <Text style={sectionLabel} className="text-muted">WHAT MATTERS TODAY</Text>
                <Text style={perspectiveText} className="text-body-strong">{perspective}</Text>
              </Section>
              <Hr style={divider} className="email-divider" />
            </>
          )}

          {/* Hero Story */}
          <Section style={section}>
            <Text style={sectionLabel} className="text-muted">TODAY'S LEAD STORY</Text>
            <Heading as="h2" style={heroTitle} className="text-heading">
              {heroStory.title}
            </Heading>
            <Text style={bodyText} className="text-body">{heroStory.body}</Text>
            <Text style={sourceText}>
              <Link href={heroStory.source.url} style={sourceLink} className="link-primary">
                → {heroStory.source.name}
              </Link>
            </Text>
          </Section>

          {/* Quick Hits */}
          {quickHits.length > 0 && (
            <>
              <Hr style={divider} className="email-divider" />
              <Section style={section}>
                <Text style={sectionLabel} className="text-muted">ALSO WORTH KNOWING</Text>
              </Section>
              {quickHits.map((item, index) => (
                <Section key={index} style={quickHitSection}>
                  <Heading as="h3" style={quickHitTitle} className="text-body-strong">
                    {item.title}
                  </Heading>
                  <Text style={quickHitBody} className="text-body">{item.body}</Text>
                  <Text style={sourceText}>
                    <Link href={item.source.url} style={sourceLink} className="link-primary">
                      → {item.source.name}
                    </Link>
                  </Text>
                </Section>
              ))}
            </>
          )}

          {/* Did You Know */}
          <Hr style={divider} className="email-divider" />
          <Section style={section}>
            <Text style={sectionLabel} className="text-muted">💡 DID YOU KNOW?</Text>
            <Text style={curiosityText} className="text-body-strong">{curiosity.text}</Text>
            {curiosity.source && (
              <Text style={curiositySource} className="text-muted">
                —{" "}
                <Link href={curiosity.source.url} style={curiosityLink} className="text-muted">
                  {curiosity.source.name}
                </Link>
              </Text>
            )}
          </Section>

          {/* What's Hot */}
          {whatsHot && whatsHot.length > 0 && (
            <>
              <Hr style={divider} className="email-divider" />
              <Section style={section}>
                <Text style={sectionLabel} className="text-muted">🔥 WHAT'S HOT</Text>
                <Text style={whatsHotSubtitle} className="text-muted">Funding, M&A & Product Launches</Text>
                {groupWhatsHotByRegion(whatsHot).map((group) => (
                  <React.Fragment key={group.region}>
                    <Text style={regionHeader} className="text-body">
                      {group.info.emoji} {group.info.name}
                    </Text>
                    {group.items.map((item, index) => (
                      <Text key={index} style={whatsHotItem} className="text-body">
                        {item.flag}{" "}
                        <span style={whatsHotType} className="text-muted">({item.type})</span>{" "}
                        <span style={whatsHotCompany} className="text-body-strong">{item.company}</span>{" "}
                        {item.description}
                        {item.source_url && (
                          <>
                            {"… "}
                            <Link href={item.source_url} style={whatsHotLink} className="link-primary">
                              Read more
                            </Link>
                          </>
                        )}
                      </Text>
                    ))}
                  </React.Fragment>
                ))}
              </Section>
            </>
          )}

          {/* Signature */}
          <Hr style={divider} className="email-divider" />
          <Section style={signatureSection}>
            <Text style={signatureText} className="text-body-strong">
              Made with ❤️ for the payments community
            </Text>
            <Text style={signatureAuthor} className="text-body">
              by <Link href="https://www.linkedin.com/in/cesarhernandezm" style={signatureLink} className="link-primary">Cesar Hernandez</Link>
            </Text>
          </Section>

          {/* Share Section */}
          <Hr style={divider} className="email-divider" />
          <Section style={shareSection}>
            <Text style={shareHeading} className="text-body-strong">
              Share the Nerd's take
            </Text>
            <Text style={shareSubtext} className="text-body">
              Your payments friends get smarter, you get rewarded. Win-win.
            </Text>
            <Text style={shareIncentive} className="text-body">
              Share your unique link and unlock exclusive content as you refer more readers.
            </Text>
            <Link href={`https://www.thepaymentsnerd.co?ref=${referralCode}`} style={referralLinkStyle} className="bg-card link-primary">
              https://www.thepaymentsnerd.co?ref={referralCode}
            </Link>

            <table
              role="presentation"
              cellSpacing="0"
              cellPadding="0"
              style={{ margin: "24px auto 0", textAlign: "center" as const }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "0 12px" }}>
                    <Link href={getXShareUrl(referralCode)}>
                      <img src="https://www.thepaymentsnerd.co/images/x-logo.png" alt="Share on X" width="28" height="28" style={{ display: "block" }} />
                    </Link>
                  </td>
                  <td style={{ padding: "0 12px" }}>
                    <Link href={getLinkedInShareUrl(referralCode)}>
                      <img src="https://www.thepaymentsnerd.co/images/linkedin-logo.png" alt="Share on LinkedIn" width="28" height="28" style={{ display: "block" }} />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Footer */}
          <Section style={footer} className="email-footer">
            <Text style={footerLinksRow} className="text-muted">
              <Link
                href="mailto:cesar@thepaymentsnerd.co?subject=Sponsorship%20Inquiry%20%E2%80%94%20The%20Payments%20Nerd"
                style={footerLinkBold}
                className="text-body"
              >
                ADVERTISE
              </Link>
              {"  //  "}
              <Link href={unsubscribeUrl} style={footerLink} className="text-muted">
                Unsubscribe
              </Link>
              {"  //  "}
              <Link href="https://www.thepaymentsnerd.co" style={footerLink} className="text-muted">
                View Online
              </Link>
            </Text>
            <Text style={footerTagline} className="text-subtle">
              Five critical payments insights. Zero noise. Daily.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Helper functions
function getXShareUrl(referralCode: string): string {
  const text = encodeURIComponent(
    "Just discovered /thepaymentsnerd - a daily AI-curated briefing on payments industry news. Worth checking out!"
  );
  const url = encodeURIComponent(`https://www.thepaymentsnerd.co?ref=${referralCode}`);
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
}

function getLinkedInShareUrl(referralCode: string): string {
  const url = encodeURIComponent(`https://www.thepaymentsnerd.co?ref=${referralCode}`);
  return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
}

// Styles with dark mode support
const main = {
  backgroundColor: "#fafaf9",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
};

const header = {
  padding: "40px 40px 32px 40px",
};

const logoHeading = {
  margin: "0 0 8px 0",
  fontSize: "26px",
  fontWeight: "700",
  color: "#0a0a0a",
  letterSpacing: "-0.5px",
};

const dateText = {
  margin: "0",
  fontSize: "14px",
  color: "#737373",
  fontWeight: "400",
};

const viewOnlineLink = {
  fontSize: "11px",
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "500",
  whiteSpace: "nowrap" as const,
  display: "inline-block",
  lineHeight: "16px",
};

const section = {
  padding: "0 40px 32px 40px",
};

const signatureSection = {
  padding: "24px 40px 32px 40px",
};

const sectionLabel = {
  margin: "0 0 12px 0",
  fontSize: "11px",
  fontWeight: "700",
  color: "#737373",
  textTransform: "uppercase" as const,
  letterSpacing: "0.8px",
};

const perspectiveText = {
  margin: "0",
  fontSize: "17px",
  color: "#171717",
  lineHeight: "1.7",
  fontWeight: "500",
};

const heroTitle = {
  margin: "0 0 16px 0",
  fontSize: "24px",
  fontWeight: "700",
  color: "#0a0a0a",
  lineHeight: "1.3",
};

const bodyText = {
  margin: "0 0 12px 0",
  fontSize: "17px",
  color: "#404040",
  lineHeight: "1.7",
};

const sourceText = {
  margin: "0",
  fontSize: "15px",
};

const sourceLink = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "500",
};

const quickHitSection = {
  padding: "0 40px 28px 40px",
};

const quickHitTitle = {
  margin: "0 0 8px 0",
  fontSize: "18px",
  fontWeight: "600",
  color: "#171717",
  lineHeight: "1.4",
};

const quickHitBody = {
  margin: "0 0 8px 0",
  fontSize: "16px",
  color: "#525252",
  lineHeight: "1.6",
};

const curiosityText = {
  margin: "0 0 8px 0",
  fontSize: "16px",
  color: "#262626",
  lineHeight: "1.6",
};

const curiositySource = {
  margin: "0",
  fontSize: "14px",
  color: "#737373",
};

const curiosityLink = {
  color: "#737373",
  textDecoration: "none",
  fontStyle: "italic",
};

const divider = {
  borderTop: "1px solid #e5e5e5",
  margin: "0",
};

const signatureText = {
  margin: "0 0 8px 0",
  fontSize: "15px",
  color: "#171717",
  fontWeight: "400",
  textAlign: "center" as const,
};

const signatureAuthor = {
  margin: "0",
  fontSize: "14px",
  color: "#525252",
  textAlign: "center" as const,
};

const signatureLink = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "500",
};

const shareSection = {
  padding: "32px 40px",
  textAlign: "center" as const,
};

const shareHeading = {
  margin: "0 0 12px 0",
  fontSize: "18px",
  color: "#171717",
  fontWeight: "700",
};

const shareSubtext = {
  margin: "0 0 16px 0",
  fontSize: "15px",
  color: "#404040",
  lineHeight: "1.6",
};

const shareIncentive = {
  margin: "0 0 12px 0",
  fontSize: "14px",
  color: "#525252",
  lineHeight: "1.5",
};

const referralLinkStyle = {
  display: "block",
  margin: "0",
  padding: "12px 16px",
  backgroundColor: "#f4f4f5",
  color: "#2563eb",
  textDecoration: "none",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "500",
  border: "1px solid #e5e5e5",
  wordBreak: "break-all" as const,
};

const sponsorSection = {
  padding: "24px 40px",
  textAlign: "center" as const,
};

const sponsorLabel = {
  margin: "0 0 8px 0",
  fontSize: "10px",
  fontWeight: "700",
  color: "#a3a3a3",
  textTransform: "uppercase" as const,
  letterSpacing: "1.5px",
};

const sponsorLogoLink = {
  textDecoration: "none",
};

const sponsorLogo = {
  maxWidth: "180px",
  maxHeight: "40px",
  display: "block" as const,
  margin: "0 auto",
};

const sponsorNameLink = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#171717",
  textDecoration: "none",
  letterSpacing: "-0.3px",
};

const footerLinksRow = {
  margin: "0 0 12px 0",
  fontSize: "13px",
  color: "#737373",
  textAlign: "center" as const,
};

const footerLinkBold = {
  color: "#525252",
  textDecoration: "none",
  fontWeight: "700",
  letterSpacing: "0.5px",
};

const footer = {
  padding: "32px 40px",
  textAlign: "center" as const,
  borderTop: "1px solid #e5e5e5",
};

const footerText = {
  margin: "0 0 8px 0",
  fontSize: "13px",
  color: "#737373",
};

const footerLink = {
  color: "#737373",
  textDecoration: "none",
};

const footerTagline = {
  margin: "12px 0 0 0",
  fontSize: "12px",
  color: "#a3a3a3",
};

const whatsHotSubtitle = {
  margin: "0 0 16px 0",
  fontSize: "13px",
  color: "#737373",
  fontStyle: "italic",
};

const regionHeader = {
  margin: "16px 0 8px 0",
  fontSize: "13px",
  fontWeight: "700",
  color: "#525252",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const whatsHotItem = {
  margin: "0 0 10px 0",
  fontSize: "15px",
  color: "#404040",
  lineHeight: "1.6",
  paddingLeft: "8px",
};

const whatsHotType = {
  fontSize: "13px",
  color: "#737373",
  fontWeight: "400",
};

const whatsHotCompany = {
  fontWeight: "700",
  color: "#171717",
};

const whatsHotLink = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "500",
  fontSize: "14px",
};

export default DailyNewsletter;
