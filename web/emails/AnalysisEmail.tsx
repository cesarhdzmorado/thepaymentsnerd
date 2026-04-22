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
import { emailDarkModeCss } from "./darkMode";

interface AnalysisEmailProps {
  title: string;
  subtitle?: string;
  formattedDate: string;
  bodyHtml: string;
  unsubscribeUrl: string;
  referralCode: string;
}

export function AnalysisEmail({
  title,
  subtitle,
  formattedDate,
  bodyHtml,
  unsubscribeUrl,
  referralCode,
}: AnalysisEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{emailDarkModeCss}</style>
      </Head>
      <Preview>{subtitle || title}</Preview>
      <Body style={main} className="email-body">
        <Container style={container} className="email-container">
          {/* Header */}
          <Section style={header}>
            <Heading style={logoHeading} className="text-heading">/thepaymentsnerd</Heading>
            <Text style={labelText} className="link-primary">ANALYSIS</Text>
            <Text style={dateText} className="text-muted">{formattedDate}</Text>
          </Section>

          {/* Title */}
          <Section style={section}>
            <Heading as="h1" style={titleStyle} className="text-heading">
              {title}
            </Heading>
            {subtitle && (
              <Text style={subtitleStyle} className="text-body">{subtitle}</Text>
            )}
          </Section>

          <Hr style={divider} className="email-divider" />

          {/* Body (rendered markdown HTML) */}
          <Section style={section}>
            <div
              style={bodyStyle}
              className="analysis-body"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </Section>

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
              Found this analysis useful?
            </Text>
            <Text style={shareSubtext} className="text-body">
              Share it with your payments network.
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
              Deep payments analysis. Zero noise.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function getXShareUrl(referralCode: string): string {
  const text = encodeURIComponent(
    "Great analysis from /thepaymentsnerd on the latest payments trends. Worth a read!"
  );
  const url = encodeURIComponent(`https://www.thepaymentsnerd.co?ref=${referralCode}`);
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
}

function getLinkedInShareUrl(referralCode: string): string {
  const url = encodeURIComponent(`https://www.thepaymentsnerd.co?ref=${referralCode}`);
  return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
}

// Styles
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
  padding: "40px 40px 24px 40px",
};

const logoHeading = {
  margin: "0 0 8px 0",
  fontSize: "26px",
  fontWeight: "700",
  color: "#0a0a0a",
  letterSpacing: "-0.5px",
};

const labelText = {
  margin: "0 0 4px 0",
  fontSize: "11px",
  fontWeight: "700",
  color: "#2563eb",
  textTransform: "uppercase" as const,
  letterSpacing: "1.5px",
};

const dateText = {
  margin: "0",
  fontSize: "14px",
  color: "#737373",
  fontWeight: "400",
};

const section = {
  padding: "0 40px 32px 40px",
};

const titleStyle = {
  margin: "0 0 12px 0",
  fontSize: "28px",
  fontWeight: "700",
  color: "#0a0a0a",
  lineHeight: "1.3",
};

const subtitleStyle = {
  margin: "0",
  fontSize: "18px",
  color: "#525252",
  lineHeight: "1.5",
  fontWeight: "400",
};

const bodyStyle = {
  fontSize: "17px",
  color: "#404040",
  lineHeight: "1.7",
};

const divider = {
  borderTop: "1px solid #e5e5e5",
  margin: "0",
};

const signatureSection = {
  padding: "24px 40px 32px 40px",
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

const footerLink = {
  color: "#737373",
  textDecoration: "none",
};

const footerTagline = {
  margin: "12px 0 0 0",
  fontSize: "12px",
  color: "#a3a3a3",
};

export default AnalysisEmail;
