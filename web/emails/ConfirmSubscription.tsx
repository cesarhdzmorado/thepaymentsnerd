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
  Button,
} from "@react-email/components";
import { emailDarkModeCss } from "./darkMode";

interface ConfirmSubscriptionProps {
  confirmUrl: string;
  unsubscribeUrl: string;
}

export function ConfirmSubscription({
  confirmUrl,
  unsubscribeUrl,
}: ConfirmSubscriptionProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{emailDarkModeCss}</style>
      </Head>
      <Preview>Confirm your subscription to /thepaymentsnerd</Preview>
      <Body style={main} className="email-body">
        <Container style={container} className="email-container">
          {/* Header */}
          <Section style={header}>
            <Heading style={logoHeading} className="text-heading">/thepaymentsnerd</Heading>
          </Section>

          {/* Content */}
          <Section style={section}>
            <Text style={bodyText} className="text-body">
              Quick confirm — this makes sure nobody subscribed you by mistake.
            </Text>
            <Button href={confirmUrl} style={confirmButton} className="confirm-button">
              Confirm subscription
            </Button>
            <Text style={fallbackText} className="text-muted">
              Or copy and paste this link:{" "}
              <Link href={confirmUrl} style={linkStyle} className="link-primary">
                {confirmUrl}
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} className="email-divider" />
          <Section style={footer}>
            <Text style={footerText} className="text-muted">
              If you didn&apos;t request this, you can safely ignore this email.
            </Text>
            <Text style={footerText} className="text-muted">
              <Link href={unsubscribeUrl} style={footerLink} className="text-muted">
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

const bodyText = {
  margin: "0 0 24px 0",
  fontSize: "17px",
  color: "#404040",
  lineHeight: "1.7",
};

const confirmButton = {
  display: "inline-block",
  backgroundColor: "#0a0a0a",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 32px",
  borderRadius: "8px",
  textDecoration: "none",
};

const fallbackText = {
  margin: "16px 0 0 0",
  fontSize: "13px",
  color: "#737373",
  lineHeight: "1.5",
  wordBreak: "break-all" as const,
};

const linkStyle = {
  color: "#2563eb",
  textDecoration: "none",
};

const divider = {
  borderTop: "1px solid #e5e5e5",
  margin: "0",
};

const footer = {
  padding: "24px 40px",
  textAlign: "center" as const,
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

export default ConfirmSubscription;
