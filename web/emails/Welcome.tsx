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

interface WelcomeProps {
  referralUrl?: string;
  unsubscribeUrl: string;
}

export function Welcome({ referralUrl, unsubscribeUrl }: WelcomeProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>Welcome to /thepaymentsnerd — your first issue arrives tomorrow</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoHeading}>/thepaymentsnerd</Heading>
          </Section>

          {/* Content */}
          <Section style={section}>
            <Text style={greeting}>Welcome 👋</Text>
            <Text style={bodyText}>
              You&apos;re now subscribed to <strong>/thepaymentsnerd</strong>.
            </Text>

            <Text style={subheading}>📬 What to expect:</Text>
            <Text style={listItem}>• Daily at 9:30 AM GMT (Mon-Fri)</Text>
            <Text style={listItem}>• 5 hand-picked signals from payments &amp; fintech</Text>
            <Text style={listItem}>• 3-minute read, zero fluff</Text>
            <Text style={listItem}>• Curated daily, never generic press releases</Text>

            <Text style={bodyText}>
              I built this for myself — my daily filter through 50+ payments sources
              to find what actually matters. Makes me smarter every morning. Sharing
              in case it helps you too.
            </Text>

            <Text style={checkItem}>✓ Your first issue arrives tomorrow at 9:30 AM GMT</Text>
            <Text style={checkItem}>✓ Whitelist this email to never miss it</Text>
            <Text style={checkItem}>✓ One-click unsubscribe anytime</Text>
          </Section>

          {/* Referral */}
          {referralUrl && (
            <>
              <Hr style={divider} />
              <Section style={referralSection}>
                <Text style={referralHeading}>💙 Share with your network</Text>
                <Text style={referralSubtext}>
                  Know someone who&apos;d benefit from daily payments insights?
                  Share your unique link:
                </Text>
                <Link href={referralUrl} style={referralLinkStyle}>
                  {referralUrl}
                </Link>
              </Section>
            </>
          )}

          {/* Signature */}
          <Hr style={divider} />
          <Section style={section}>
            <Text style={signatureText}>— César</Text>
            <Text style={psText}>P.S. Questions? Just reply.</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles matching brand
const main = {
  backgroundColor: "#fafaf9",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
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
  margin: "0",
  fontSize: "26px",
  fontWeight: "700",
  color: "#0a0a0a",
  letterSpacing: "-0.5px",
};

const section = {
  padding: "0 40px 32px 40px",
};

const greeting = {
  margin: "0 0 16px 0",
  fontSize: "20px",
  color: "#171717",
  fontWeight: "600",
};

const bodyText = {
  margin: "0 0 20px 0",
  fontSize: "17px",
  color: "#404040",
  lineHeight: "1.7",
};

const subheading = {
  margin: "0 0 12px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#171717",
};

const listItem = {
  margin: "0 0 6px 0",
  fontSize: "16px",
  color: "#404040",
  lineHeight: "1.6",
  paddingLeft: "8px",
};

const checkItem = {
  margin: "0 0 4px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#171717",
  lineHeight: "1.6",
};

const referralSection = {
  padding: "24px 40px 32px 40px",
};

const referralHeading = {
  margin: "0 0 12px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#171717",
};

const referralSubtext = {
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

const signatureText = {
  margin: "0 0 8px 0",
  fontSize: "17px",
  color: "#171717",
};

const psText = {
  margin: "0",
  fontSize: "15px",
  color: "#737373",
};

const divider = {
  borderTop: "1px solid #e5e5e5",
  margin: "0",
};

const footer = {
  padding: "24px 40px",
  textAlign: "center" as const,
  borderTop: "1px solid #e5e5e5",
};

const footerText = {
  margin: "0",
  fontSize: "13px",
  color: "#737373",
};

const footerLink = {
  color: "#737373",
  textDecoration: "none",
};

export default Welcome;
